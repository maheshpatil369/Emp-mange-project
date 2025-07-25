import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart'; // Firebase core import
import 'package:provider/provider.dart'; // Provider package import
import 'firebase_options.dart'; // Firebase options import
import 'package:mobile_app/providers/auth_provider.dart'; // AuthProvider import
import 'package:mobile_app/screens/auth/login_screen.dart'; // LoginScreen import
import 'package:mobile_app/screens/main_navigation_screen.dart'; // MainNavigationScreen import
import 'package:mobile_app/screens/profile/profile_screen.dart'; // ProfileScreen import

void main() async {
  WidgetsFlutterBinding.ensureInitialized(); // Ensure Flutter widgets are initialized
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider( // AuthProvider ko provide karein
      create: (context) => AuthProvider(),
      child: MaterialApp(
        title: 'Employee Management',
        theme: ThemeData(
          primarySwatch: Colors.blue,
        ),
        home: Consumer<AuthProvider>( // AuthProvider ke state ko listen karein
          builder: (context, authProvider, child) {
            // Agar user logged in hai, toh MainNavigationScreen dikhayein
            // Firebase.auth().currentUser automatic login state maintain karta hai
            if (authProvider.user != null) {
              return const MainNavigationScreen(); // Dashboard dikhane ke liye
            } else {
              // Agar user logged out hai, toh LoginScreen dikhayein
              return const LoginScreen();
            }
          },
        ),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/profile': (context) => const ProfileScreen(), // Profile route add kiya
          '/home': (context) => const MainNavigationScreen(), // Home route
        },
      ),
    );
  }
}