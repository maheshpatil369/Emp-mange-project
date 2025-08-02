// lib/providers/auth_provider.dart
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_service.dart';
import '../models/user_model.dart'; // User model ko import karein

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();

  User? _user;
  bool _isLoading = false;
  String? _errorMessage;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  bool get isAuthenticated => _user != null;

  AuthProvider() {
    print(
        'AuthProvider initialized. Checking login status...'); // Debugging print
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      print("09876554312");
      final prefs = await SharedPreferences.getInstance();
      print("09876554312 BCED");
      final token = prefs.getString('token');
      print('Checking token: $token'); // Debugging print

      if (token != null && token.isNotEmpty) {
        // In a real app, you'd validate this token with your backend
        // and fetch actual user details. For now, assume valid.
        _user = User(email: 'user@example.com', name: 'Logged In User');
        print('User found from token: ${_user?.email}'); // Debugging print
      } else {
        _user = null;
        print('No token found, user is logged out.'); // Debugging print
      }
    } catch (e) {
      _errorMessage = 'Failed to check login status: ${e.toString()}';
      _user = null;
      print('Error checking login status: $_errorMessage'); // Debugging print
    } finally {
      _isLoading = false;
      notifyListeners();
      print(
          'Login status check complete. isAuthenticated: $isAuthenticated'); // Debugging print
    }
  }

  Future<void> signInWithEmailAndPassword(String email, String password) async {
    _isLoading = true;
    _errorMessage = null;
    _user = null;
    notifyListeners();
    print('Attempting login for: $email'); // Debugging print

    try {
      final token = await _apiService.login(email, password);

      // Verify token is not empty
      if (token.isEmpty) {
        _errorMessage = 'Invalid login response';
        _user = null;
        print('Login failed: Invalid token'); // Debugging print
        return;
      }

      // Save token to SharedPreferences
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);

      // Set user details
      _user = User(email: email, name: email.split('@')[0]);
      _errorMessage = null;
      print('Login successful for: $email'); // Debugging print
    } catch (e) {
      _errorMessage = 'Login failed: ${e.toString()}';
      _user = null;
      print('Login failed: $_errorMessage'); // Debugging print
    } finally {
      _isLoading = false;
      notifyListeners();
      print(
          'Login attempt finished. isAuthenticated: $isAuthenticated'); // Debugging print
    }
  }

  Future<void> signOut() async {
    _isLoading = true;
    notifyListeners();
    print('Attempting logout...'); // Debugging print
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('token');
      _user = null;
      _errorMessage = null;
      print('Logout successful.'); // Debugging print
    } catch (e) {
      _errorMessage = 'Logout failed: ${e.toString()}';
      print('Error during logout: $_errorMessage'); // Debugging print
    } finally {
      _isLoading = false;
      notifyListeners();
      print(
          'Logout attempt finished. isAuthenticated: $isAuthenticated'); // Debugging print
    }
  }
}
