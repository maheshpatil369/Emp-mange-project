// mobile_app/lib/widgets/comman/custom_drawer.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/providers/auth_provider.dart';
import 'package:mobile_app/screens/profile/profile_screen.dart'; // ProfileScreen import kiya

class CustomDrawer extends StatelessWidget {
  const CustomDrawer({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context, listen: false); // listen: false kyuki yahan sirf action chahiye

    return Drawer(
      child: Column(
        children: <Widget>[
          AppBar(
            title: const Text('Menu'),
            automaticallyImplyLeading: false, // Back button nahi dikhana
          ),
          ListTile(
            leading: const Icon(Icons.home),
            title: const Text('Home'),
            onTap: () {
              Navigator.of(context).pushReplacementNamed('/home');
            },
          ),
          // Yahan aapke doosre ListTiles honge (jaise Data Screen, Home Screen)
          // ...
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Profile'),
            onTap: () {
              Navigator.of(context).pop(); // Drawer close karein
              Navigator.of(context).pushNamed('/profile'); // Profile Screen par navigate karein
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Logout'),
            onTap: () async {
              Navigator.of(context).pop(); // Drawer close karein
              try {
                await authProvider.signOut();
                // Logout ke baad main.dart ka Consumer automatic LoginScreen par redirect karega
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(e.toString())),
                );
              }
            },
          ),
        ],
      ),
    );
  }
}