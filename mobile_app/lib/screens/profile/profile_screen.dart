// import 'package:flutter/material.dart';
// import 'package:provider/provider.dart';
// import 'package:mobile_app/providers/auth_provider.dart'; // AuthProvider import

// class ProfileScreen extends StatelessWidget {
//   const ProfileScreen({super.key});

//   @override
//   Widget build(BuildContext context) {
//     final authProvider = Provider.of<AuthProvider>(context);
//     final user = authProvider.user; // Logged-in user object

//     if (user == null) {
//       return const Scaffold(
//         body: Center(
//           child: CircularProgressIndicator(), // User data load ho raha hai
//         ),
//       );
//     }

//     return Scaffold(
//       appBar: AppBar(
//         title: const Text('Profile'),
//         actions: [
//           IconButton(
//             icon: const Icon(Icons.logout),
//             onPressed: () async {
//               try {
//                 await authProvider.signOut();
//                 // Logout successful. main.dart ka Consumer automatic LoginScreen par redirect karega.
//               } catch (e) {
//                 ScaffoldMessenger.of(context).showSnackBar(
//                   SnackBar(content: Text(e.toString())),
//                 );
//               }
//             },
//           ),
//         ],
//       ),
//       body: Center(
//         child: Column(
//           mainAxisAlignment: MainAxisAlignment.center,
//           children: [
//             Text(
//               'Welcome, ${user.displayName ?? user.email ?? 'Logged In User'}!',
//               style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
//               textAlign: TextAlign.center,
//             ),
//             if (user.email != null)
//               Padding(
//                 padding: const EdgeInsets.all(8.0),
//                 child: Text(
//                   'Email: ${user.email}',
//                   style: const TextStyle(fontSize: 18, color: Colors.grey),
//                 ),
//               ),
//           ],
//         ),
//       ),
//     );
//   }
// }



import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/providers/auth_provider.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final authProvider = Provider.of<AuthProvider>(context);
    final user = authProvider.user;

    if (user == null) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: Colors.white,
      body: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 60),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            // Profile Logo
            Center(
              child: CircleAvatar(
                radius: 70,
                backgroundColor: Colors.teal.shade300,
                child: const Icon(Icons.person, size: 80, color: Colors.white),
              ),
            ),
            const SizedBox(height: 25),

            // Name
            Text(
              user.displayName ?? user.email ?? 'User',
              style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),

            // Email
            if (user.email != null)
              Text(
                user.email!,
                style: const TextStyle(fontSize: 18, color: Colors.grey),
                textAlign: TextAlign.center,
              ),

            const SizedBox(height: 40),

            // Logout Button (Reduced Width)
            Center(
              child: SizedBox(
                width: 200, // 👈 Chhoti width
                child: ElevatedButton(
                  onPressed: () async {
                    try {
                      await authProvider.signOut();
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(content: Text(e.toString())),
                      );
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  child: const Text("Logout", style: TextStyle(color: Colors.white, fontSize: 18)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
