// lib/screens/home/home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../providers/data_provider.dart';
import '../../services/connectivity_service.dart';
import '../../api/api_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _selectedTaluka;
  String? _userDistrict; // Store user's district

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DataProvider>(context, listen: false).loadConfig();
      _loadUserDistrict(); // Load user's district
    });
  }

  // Add this method to get user's district with caching
  void _loadUserDistrict() async {
    try {
      // First, try to load from SharedPreferences (offline fallback)
      final prefs = await SharedPreferences.getInstance();
      final cachedDistrict = prefs.getString('userDistrict');

      if (cachedDistrict != null) {
        setState(() {
          _userDistrict = cachedDistrict;
        });
        print('Loaded cached user district: $cachedDistrict');
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
      print('User district fetched and cached: $displayName');
    } catch (e) {
      print('Error fetching user district: $e');

      // If we have cached data, use it; otherwise, use fallback
      if (_userDistrict == null) {
        final prefs = await SharedPreferences.getInstance();
        final cachedDistrict = prefs.getString('userDistrict');

        setState(() {
          _userDistrict = cachedDistrict ?? 'Unknown District';
        });

        if (cachedDistrict != null) {
          print('Using cached district due to API error: $cachedDistrict');
        } else {
          print('No cached district available, using fallback');
        }
      }
    }
  }

  // Static method to clear cached district data (useful for logout)
  static Future<void> clearCachedDistrict() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('userDistrict');
      print('Cached user district cleared');
    } catch (e) {
      print('Error clearing cached district: $e');
    }
  }

  void _assignBundle() async {
    if (_selectedTaluka == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a Taluka to assign.')),
      );
      return;
    }

    final dataProvider = Provider.of<DataProvider>(context, listen: false);
    try {
      final result = await dataProvider.assignWorkBundle(_selectedTaluka!);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result)),
      );
      setState(() {
        _selectedTaluka = null;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text(dataProvider.errorMessage ?? 'Failed to assign bundle.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<DataProvider>(
        builder: (context, dataProvider, child) {
          // Check for initial loading state
          if (dataProvider.isLoadingConfig) {
            return const Center(child: CircularProgressIndicator());
          }

          // Check if there's an error and no data to display.
          // Fallback to offline display.
          bool isOfflinePage = isOffline ||
              (dataProvider.errorMessage != null &&
                  dataProvider.errorMessage!
                      .contains('Failed to load configuration'));

          // List<String> availableTalukas = dataProvider.filteredTalukas;
          String? userDistrictSlug;
          if (_userDistrict != null) {
            print('User District: $_userDistrict');
            // Find the slug for the user's district
            final district = dataProvider.districts.firstWhere(
              (d) => d['name']?.toLowerCase() == _userDistrict!.toLowerCase(),
              orElse: () => {},
            );
            userDistrictSlug = district['slug'];
            print('User District Slug: $userDistrictSlug');
          }

          // Get talukas for the user's district only
          List<String> availableTalukas = [];
          if (userDistrictSlug != null) {
            print('User District Slug: $userDistrictSlug');
            final location = dataProvider.fullLocationData.firstWhere(
              (loc) => loc['slug'] == userDistrictSlug,
              orElse: () => {},
            );
            availableTalukas = List<String>.from(location['talukas'] ?? []);
          } else if (_userDistrict != null &&
              _userDistrict != 'Unknown District') {
            // Fallback: If we have district name but no slug, try to get talukas from hardcoded data
            if (_userDistrict == 'Ahilyanagar') {
              availableTalukas = [
                'Ahmednagar',
                'Jamkhed',
                'Karjat',
                'Kopargaon',
                'Nevasa',
                'Parner',
                'Pathardi',
                'Rahata',
                'Rahuri',
                'Sangamner',
                'Shevgaon',
                'Shirdi',
                'Shrigonda',
                'Akole'
              ];
            } else if (_userDistrict == 'Chhatrapati Sambhajinagar') {
              availableTalukas = [
                'Aurangabad',
                'Gangapur',
                'Kannad',
                'Khultabad',
                'Paithan',
                'Sillod',
                'Vaijapur',
                'Phulambri',
                'Soegaon'
              ];
            }
            print('Using hardcoded talukas for district: $_userDistrict');
          }

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Assign New Work Bundle',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),

                  // Display user's district instead of dropdown
                  Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                    child: Row(
                      children: [
                        Icon(Icons.location_on,
                            color: isOfflinePage ? Colors.orange : Colors.green),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                _userDistrict ?? 'Loading district...',
                                style: const TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              if (isOfflinePage &&
                                  _userDistrict != null &&
                                  _userDistrict != 'Unknown District')
                                const Text(
                                  'Cached data - offline mode',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.orange,
                                    fontStyle: FontStyle.italic,
                                  ),
                                ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 15),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    value: _selectedTaluka,
                    hint: const Text('Select Taluka'),
                    items: availableTalukas.map((taluka) {
                      return DropdownMenuItem(
                        value: taluka,
                        child: Text(
                          taluka,
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: (newValue) {
                      setState(() {
                        _selectedTaluka = newValue;
                      });
                    },
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Taluka',
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: isOfflinePage ? null : _assignBundle,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 15),
                    ),
                    child: dataProvider.isAssigningBundle
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text(
                            'Assign Bundle',
                            style: TextStyle(fontSize: 18),
                          ),
                  ),
                  // Offline Message
                  if (isOfflinePage)
                    Padding(
                      padding: const EdgeInsets.only(top: 20.0),
                      child: Text(
                        'Can\'t connect gracefully.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: Colors.red[700],
                            fontStyle: FontStyle.italic),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
