// lib/main.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'providers/data_provider.dart';
import 'helpers/database_helper.dart'; // Import zaroori hai
import 'screens/auth/login_screen.dart';
import 'screens/main_navigation_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (ctx) => AuthProvider()),
        ChangeNotifierProxyProvider<AuthProvider, DataProvider>(
          create: (ctx) => DataProvider(),
          update: (ctx, auth, previousDataProvider) {
            if (!auth.isAuthenticated) {
              previousDataProvider?.clearAllLocalData();
            }
            return previousDataProvider!;
          },
        ),
      ],
      child: const MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Data Management App',
      theme: ThemeData(
        primarySwatch: Colors.indigo,
        visualDensity: VisualDensity.adaptivePlatformDensity,
      ),
      home: Consumer<AuthProvider>(
        builder: (ctx, auth, _) {
          if (auth.isAuthenticated) {
            return const MainNavigationScreen();
          } else {
            return const LoginScreen();
          }
        },
      ),
      routes: {
        '/home': (ctx) => const MainNavigationScreen(),
      },
    );
  }
}

// Ye extension method DataProvider ko local data clear karne me madad karega
extension DataProviderExtension on DataProvider {
  Future<void> clearAllLocalData() async {
    await DatabaseHelper.instance.clearRecords();
    await fetchLocalData();
  }
}