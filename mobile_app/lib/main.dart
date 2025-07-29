// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:mobile_app/providers/auth_provider.dart';
import 'package:mobile_app/providers/data_provider.dart';
import 'package:mobile_app/screens/auth/login_screen.dart';
import 'package:mobile_app/screens/main_navigation_screen.dart';
import 'package:mobile_app/screens/profile/profile_screen.dart';
import 'package:mobile_app/screens/data_management/data_screen.dart';

// Conditional import for sqflite_common_ffi_web
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart'; // ADD THIS IMPORT
import 'package:sqflite_common_ffi/sqflite_ffi.dart'; // ADD THIS IMPORT (for desktop ffi)

void main() {
  // FIX: Initialize sqflite_common_ffi_web for web platform
  if (kIsWeb) {
    databaseFactory = databaseFactoryFfiWeb;
  } else {
    // Optionally initialize ffi for desktop if you plan to build for desktop
    // This is good practice if you intend to support Windows/Linux/macOS later.
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  }

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => DataProvider()),
      ],
      child: MaterialApp(
        title: 'Emp Management App',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        home: Consumer<AuthProvider>(
          builder: (context, authProvider, child) {
            if (authProvider.isAuthenticated) {
              return const MainNavigationScreen();
            } else {
              return const LoginScreen();
            }
          },
        ),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const MainNavigationScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/data_management': (context) => const DataScreen(),
        },
      ),
    );
  }
}
