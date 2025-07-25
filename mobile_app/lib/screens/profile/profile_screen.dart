import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/providers/auth_provider.dart'; // AuthProvider import

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user; // Logged-in user object

    if (user == null) {
      return const Scaffold(
        body: Center(
          child: CircularProgressIndicator(), // User data load ho raha hai
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Profile'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              try {
                await authProvider.signOut();
                // Logout successful. main.dart ka Consumer automatic LoginScreen par redirect karega.
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(e.toString())),
                );
              }
            },
          ),
        ],
      ),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome, ${user.displayName ?? user.email ?? 'Logged In User'}!',
              style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            if (user.email != null)
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: Text(
                  'Email: ${user.email}',
                  style: const TextStyle(fontSize: 18, color: Colors.grey),
                ),
              ),
          ],
        ),
      ),
    );
  }
}