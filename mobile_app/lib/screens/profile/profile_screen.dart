// lib/screens/profile/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../services/connectivity_service.dart';
import '../../api/api_service.dart';

class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  String? _userDistrict;

  @override
  void initState() {
    super.initState();
    _loadUserDistrict();
  }

  // Load user's district with caching (similar to home_screen.dart)
  Future<void> _loadUserDistrict() async {
    try {
      // First, try to load from SharedPreferences (offline fallback)
      final prefs = await SharedPreferences.getInstance();
      final cachedDistrict = prefs.getString('userDistrict');

      if (cachedDistrict != null) {
        setState(() {
          _userDistrict = cachedDistrict;
        });
        print('Profile: Loaded cached user district: $cachedDistrict');
      }

      // Try to fetch fresh data from API
      String location = await ApiService().getUserLocation();
      String displayName;

      if (location == "ahilyanagar") {
        displayName = "Ahilyanagar";
      } else if (location == "chhatrapati-sambhajinagar") {
        displayName = "Chhatrapati Sambhajinagar";
      } else {
        displayName = location;
      }

      // Update state and cache the result
      setState(() {
        _userDistrict = displayName;
      });

      // Save to SharedPreferences for offline access
      await prefs.setString('userDistrict', displayName);
      print('Profile: User district fetched and cached: $displayName');
    } catch (e) {
      print('Profile: Error fetching user district: $e');

      // If we have cached data, use it; otherwise, use fallback
      if (_userDistrict == null) {
        try {
          final prefs = await SharedPreferences.getInstance();
          final cachedDistrict = prefs.getString('userDistrict');

          setState(() {
            _userDistrict = cachedDistrict ?? 'Unknown District';
          });

          if (cachedDistrict != null) {
            print(
                'Profile: Using cached district due to API error: $cachedDistrict');
          } else {
            print('Profile: No cached district available, using fallback');
          }
        } catch (prefError) {
          print('Profile: Error accessing SharedPreferences: $prefError');
          setState(() {
            _userDistrict = 'Unknown District';
          });
        }
      }
    }
  }

  // Check if the app is in offline mode
  bool _isOfflineMode() {
    final dataProvider = Provider.of<DataProvider>(context, listen: false);
    return isOffline ||
        (dataProvider.errorMessage != null &&
            dataProvider.errorMessage!
                .contains('Failed to load configuration'));
  }

  // Static method to clear cached district data (useful for logout)
  static Future<void> clearCachedDistrict() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('userDistrict');
      print('Profile: Cached user district cleared');
    } catch (e) {
      print('Profile: Error clearing cached district: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          final user = authProvider.user;

          if (user == null) {
            return const Center(child: Text('User not logged in.'));
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                const CircleAvatar(
                  radius: 50,
                  backgroundColor: Colors.blueGrey,
                  child: Icon(
                    Icons.person,
                    size: 60,
                    color: Colors.white,
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  // `user.name` use karein
                  user.name,
                  style: const TextStyle(
                      fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 10),
                Text(
                  user.email,
                  style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                ),
                const SizedBox(height: 30),
                Card(
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  child: ListTile(
                    leading: const Icon(Icons.email),
                    title: const Text('Username'),
                    subtitle: Text(user.email),
                  ),
                ),
                const SizedBox(height: 10),
                Card(
                  margin: const EdgeInsets.symmetric(horizontal: 10),
                  child: ListTile(
                    leading: Icon(
                      Icons.location_on,
                      color: _isOfflineMode() ? Colors.orange : Colors.green,
                    ),
                    title: const Text('Location'),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(_userDistrict ?? 'Loading...'),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () async {
                    // Get DataProvider to check for unsynced records
                    final dataProvider =
                        Provider.of<DataProvider>(context, listen: false);

                    // Check if there are unsynced records
                    final hasUnsynced = await dataProvider.hasUnsyncedRecords;
                    
                    if (hasUnsynced) {
                      // Show popup that prevents logout
                      showDialog(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Cannot Logout'),
                          content: const Text(
                            'You have unsynced records in temporary storage. Please sync all records to server before logging out.'
                          ),
                          actions: [
                            TextButton(
                              onPressed: () => Navigator.of(context).pop(),
                              child: const Text('OK'),
                            ),
                          ],
                        ),
                      );
                      return; // Prevent logout
                    }

                    // Show loading indicator
                    showDialog(
                      context: context,
                      barrierDismissible: false,
                      builder: (context) => const Center(
                        child: CircularProgressIndicator(),
                      ),
                    );

                    try {
                      // CRITICAL: Save current bundles AND records state to SharedPreferences BEFORE clearing
                      await dataProvider.saveDataBeforeLogout();

                      // Clear cached district data
                      await _ProfileScreenState.clearCachedDistrict();

                      // Then clear only runtime data (not SharedPreferences)
                      await dataProvider.clearRuntimeUserData();

                      // Then sign out from auth
                      await authProvider.signOut();

                      // Close loading dialog
                      Navigator.of(context).pop();

                      Navigator.of(context).pushReplacementNamed('/login');
                    } catch (e) {
                      // Close loading dialog
                      Navigator.of(context).pop();

                      // Show error
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Logout error: $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text('Logout'),
                  style: ElevatedButton.styleFrom(
                    foregroundColor: Colors.white,
                    backgroundColor: Colors.red,
                    padding: const EdgeInsets.symmetric(
                        horizontal: 30, vertical: 15),
                    textStyle: const TextStyle(fontSize: 18),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}
