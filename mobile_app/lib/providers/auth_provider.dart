import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_auth/firebase_auth.dart'; // Nayi import line
// import '../api/api_service.dart'; // Yeh line remove kar dein

class AuthProvider with ChangeNotifier {
  // ApiService ki ab yahan zaroorat nahi
  // final ApiService _apiService = ApiService(); // Yeh line remove kar dein
  String? _token; // Firebase se milne wala ID token store karenge
  bool _isLoading = false;

  bool get isAuthenticated => _token != null;
  bool get isLoading => _isLoading;

  AuthProvider() {
    _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    // SharedPreferences mein Firebase ID token store karenge
    if (prefs.containsKey('firebase_token')) { // Key name change kiya
      _token = prefs.getString('firebase_token');
      notifyListeners();
    }
  }

  // Login function ab Firebase Authentication use karegi
  Future<bool> login(String email, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final credential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      // Login successful hone par Firebase ID token lein
      _token = await credential.user?.getIdToken();
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('firebase_token', _token!); // Token save karein (Key name change kiya)
      notifyListeners();
      return true;
    } on FirebaseAuthException catch (e) {
      String errorMessage = 'Login Failed.';
      if (e.code == 'user-not-found') {
        errorMessage = 'User not found. Please check your email.'; // User not exist
      } else if (e.code == 'wrong-password') {
        errorMessage = 'Wrong password provided for that user.';
      } else if (e.code == 'invalid-email') {
        errorMessage = 'The email address is not valid.';
      }
      debugPrint('Firebase Auth Error: ${e.code} - ${e.message}');
      // Error message user ko show karein
      throw Exception(errorMessage); // Exception throw karein takki LoginScreen handle kar sake
    } catch (e) {
      debugPrint('General Login Error: ${e.toString()}');
      throw Exception('An unexpected error occurred during login.');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await FirebaseAuth.instance.signOut(); // Firebase se sign out karein
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('firebase_token'); // Token remove karein (Key name change kiya)
    notifyListeners();
  }
}