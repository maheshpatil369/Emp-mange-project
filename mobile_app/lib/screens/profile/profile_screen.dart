// lib/screens/profile/profile_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';
import '../../api/api_service.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

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
                    leading: const Icon(Icons.location_on),
                    title: const Text('Location'),
                    subtitle: FutureBuilder<String>(
                      future: ApiService().getUserLocation(),
                      builder: (context, snapshot) {
                        if (snapshot.connectionState ==
                            ConnectionState.waiting) {
                          return const Text('Loading...');
                        } else if (snapshot.hasError) {
                          return Text('Error: ${snapshot.error}');
                        } else {
                          final location = snapshot.data ?? 'Unknown';
                          if (location.toLowerCase() == 'ahilyanagar') {
                            return const Text('Ahilyanagar');
                          } else if (location.toLowerCase() ==
                              'chhatrapati-sambhajinagar') {
                            return const Text('Chhatrapati Sambhajinagar');
                          } else {
                            return Text(location);
                          }
                        }
                      },
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                ElevatedButton.icon(
                  onPressed: () async {
                    // Show loading indicator
                    showDialog(
                      context: context,
                      barrierDismissible: false,
                      builder: (context) => const Center(
                        child: CircularProgressIndicator(),
                      ),
                    );

                    try {
                      // Get DataProvider to save current state before clearing
                      final dataProvider =
                          Provider.of<DataProvider>(context, listen: false);

                      // CRITICAL: Save current bundles AND records state to SharedPreferences BEFORE clearing
                      await dataProvider.saveDataBeforeLogout();

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
