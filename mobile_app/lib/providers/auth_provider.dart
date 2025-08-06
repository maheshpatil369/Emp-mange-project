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
  Future<void> checkLoginStatus() async => _checkLoginStatus();

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
      // Use the new isAuthenticated method from ApiService
      final isAuth = await _apiService.isAuthenticated();

      if (isAuth) {
        final prefs = await SharedPreferences.getInstance();
        final name = prefs.getString('name');
        final email = prefs.getString('email');

        if (name != null && email != null) {
          _user = User(name: name, email: email);
          print('User authenticated successfully with valid/refreshed token');
        } else {
          // If tokens are valid but user info is missing, clear everything
          await _apiService.logout();
          _user = null;
          print('Token valid but user info missing, cleared session');
        }
      } else {
        _user = null;
        print('User is not authenticated or tokens cannot be refreshed');
      }
    } catch (e) {
      _errorMessage = 'Failed to check login status: ${e.toString()}';
      _user = null;
      print('Error checking login status: $_errorMessage');
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
      print('Calling login API with email: $email'); // Debugging print
      final token = await _apiService.login(email + "@yourapp.com", password);
      print("Login API returned token: $token"); // Debugging print

      // Verify token is not empty
      if (token.isEmpty) {
        _errorMessage = 'Invalid login response';
        _user = null;
        print('Login failed: Invalid token'); // Debugging print
        return;
      }

      // // Save token to SharedPreferences
      // final prefs = await SharedPreferences.getInstance();
      // await prefs.setString('token', token);
      // Set user details
      _user = User(email: email + "@yourapp.com", name: email);
      _errorMessage = "Login successful";
      print('Login successful for: $email'); // Debugging print
    } catch (e) {
      _errorMessage = '${e.toString()}';
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
      // Use the new logout method from ApiService
      await _apiService.logout();
      _user = null;
      _errorMessage = null;
      print('Logout successful - all tokens cleared.'); // Debugging print
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
