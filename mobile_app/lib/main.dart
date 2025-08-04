// // lib/main.dart
// import 'package:flutter/material.dart';
// import 'package:flutter_dotenv/flutter_dotenv.dart';
// import 'package:provider/provider.dart';
// import 'package:mobile_app/providers/auth_provider.dart';
// import 'package:mobile_app/providers/data_provider.dart';
// import 'package:mobile_app/screens/auth/login_screen.dart';
// import 'package:mobile_app/screens/main_navigation_screen.dart';
// import 'package:mobile_app/screens/profile/profile_screen.dart';
// import 'package:mobile_app/screens/data_management/data_screen.dart';

// // Conditional import for sqflite_common_ffi_web
// import 'package:flutter/foundation.dart' show kIsWeb;
// import 'package:sqflite_common_ffi_web/sqflite_ffi_web.dart'; // ADD THIS IMPORT
// import 'package:sqflite_common_ffi/sqflite_ffi.dart'; // ADD THIS IMPORT (for desktop ffi)
// import 'dart:io' show Platform;

// void main() async {
//   // Ensure Flutter binding is initialized
//   WidgetsFlutterBinding.ensureInitialized();

//   // Load environment configuration based on build flavor
//   String envFile =
//       const String.fromEnvironment('ENV', defaultValue: 'development');
//   await dotenv.load(fileName: '.env.$envFile');

//   // SQLite initialization (existing code)
//   if (kIsWeb) {
//     databaseFactory = databaseFactoryFfiWeb;
//   } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
//     sqfliteFfiInit();
//     databaseFactory = databaseFactoryFfi;
//   } else if (Platform.isAndroid) {
//     // Ensure SQLite is properly initialized on Android
//     try {
//       // You might want to add any specific Android SQLite initialization here
//       // For example, loading specific libraries or setting up paths
//     } catch (e) {
//       print('Android SQLite initialization error: $e');
//     }
//   }

//   runApp(const MyApp());
// }

// class MyApp extends StatelessWidget {
//   const MyApp({super.key});

//   @override
//   Widget build(BuildContext context) {
//     return MultiProvider(
//       providers: [
//         ChangeNotifierProvider(create: (context) => AuthProvider()),
//         ChangeNotifierProvider(create: (context) => DataProvider()),
//       ],
//       child: MaterialApp(
//         title: 'Employee Management App',
//         theme: ThemeData(
//           primarySwatch: Colors.blue,
//         ),
//         home: Consumer<AuthProvider>(
//           builder: (context, authProvider, child) {
//             if (authProvider.isAuthenticated) {
//               return const MainNavigationScreen();
//             } else {
//               return const LoginScreen();
//             }
//           },
//         ),
//         routes: {
//           '/login': (context) => const LoginScreen(),
//           '/home': (context) => const MainNavigationScreen(),
//           '/profile': (context) => const ProfileScreen(),
//           '/data_management': (context) => const DataScreen(),
//         },
//       ),
//     );
//   }
// }
// lib/main.dart
import 'package:flutter/material.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
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
import 'dart:io' show Platform;

void main() async {
  // Ensure Flutter binding is initialized
  WidgetsFlutterBinding.ensureInitialized();

  // Load environment configuration based on build flavor
  String envFile =
      const String.fromEnvironment('ENV', defaultValue: 'development');
  await dotenv.load(fileName: '.env.$envFile');

  // SQLite initialization (existing code)
  if (kIsWeb) {
    databaseFactory = databaseFactoryFfiWeb;
  } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
    sqfliteFfiInit();
    databaseFactory = databaseFactoryFfi;
  } else if (Platform.isAndroid) {
    // Ensure SQLite is properly initialized on Android
    try {
      // You might want to add any specific Android SQLite initialization here
      // For example, loading specific libraries or setting up paths
    } catch (e) {
      print('Android SQLite initialization error: $e');
    }
  }
  // Initialize AuthProvider and load user from prefs
  final authProvider = AuthProvider();
  await authProvider.checkLoginStatus();

  final dataProvider = DataProvider();
  // Only load bundles if user is authenticated
  if (authProvider.isAuthenticated) {
    await dataProvider
        .loadUserData(); // Use loadUserData instead of loadBundlesFromPrefsAndOverwriteDB
  }

  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>.value(value: authProvider),
        ChangeNotifierProvider<DataProvider>.value(value: dataProvider),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(builder: (context, authProvider, child) {
      if (authProvider.isLoading) {
        return const Center(child: CircularProgressIndicator());
      }
      return MaterialApp(
        title: 'Data Management App',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          primarySwatch: Colors.blue,
        ),
        home: authProvider.isAuthenticated
            ? const MainNavigationScreen()
            : const LoginScreen(),
        routes: {
          '/login': (context) => const LoginScreen(),
          '/home': (context) => const MainNavigationScreen(),
          '/profile': (context) => const ProfileScreen(),
          '/data_management': (context) => const DataScreen(),
        },
      );
    });
  }
}
