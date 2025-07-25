import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart'; // Yeh import zaroori hai

class AuthProvider extends ChangeNotifier {
  User? _user; // User object ko store karne ke liye
  bool _isLoading = false; // Isko wapas add kiya hai

  // Getter to access the current user
  User? get user => _user;

  // isLoading getter ko wapas add kiya hai
  bool get isLoading => _isLoading;

  // Constructor to initialize user state on app start
  AuthProvider() {
    // Firebase Auth state changes ko listen karein
    FirebaseAuth.instance.authStateChanges().listen((user) {
      _user = user;
      // Agar user login/logout hota hai, toh loading state clear karein
      _isLoading = false; // Ensure loading is false when state settles
      notifyListeners(); // UI ko update karne ke liye
      if (user != null) {
        print('Auth State Changed: User is logged in: ${user.email}');
      } else {
        print('Auth State Changed: User is logged out.');
      }
    });
  }

  Future<void> signInWithEmailAndPassword(String email, String password) async {
    _isLoading = true; // Login process shuru hone par isLoading ko true karein
    notifyListeners(); // UI ko update karein (e.g., CircularProgressIndicator dikhane ke liye)
    try {
      UserCredential userCredential = await FirebaseAuth.instance.signInWithEmailAndPassword(
        email: email,
        password: password,
      );
      _user = userCredential.user; // Login ke baad _user ko update karein
      // authStateChanges() listener ab _user aur notifyListeners() ko handle karega
      print('User logged in: ${_user?.email}');
    } on FirebaseAuthException catch (e) {
      String errorMessage;
      if (e.code == 'user-not-found') {
        errorMessage = 'No user found for that email.';
      } else if (e.code == 'wrong-password') {
        errorMessage = 'Wrong password provided for that user.';
      } else if (e.code == 'invalid-email') {
        errorMessage = 'The email address is not valid.';
      } else {
        errorMessage = e.message ?? 'An unknown error occurred.';
      }
      print('Login Error: $errorMessage');
      throw Exception(errorMessage); // Error ko aage pass karein
    } catch (e) {
      print('Unexpected Login Error: $e');
      throw Exception('An unexpected error occurred during login.');
    } finally {
      // Login process khatam hone par isLoading ko false karein
      // Chahe success ho ya fail, loading state ko hatana hai.
      // Note: authStateChanges listener bhi _isLoading = false; call karega, lekin yahan bhi rakhna better hai
      // agar listener ka update delay ho.
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> signOut() async {
    _isLoading = true; // Logout process shuru hone par isLoading ko true karein
    notifyListeners(); // UI ko update karein
    try {
      await FirebaseAuth.instance.signOut();
      // _user ko null set karne ki zaroorat nahi, authStateChanges() listener handle karega
      print('User logged out successfully.');
    } catch (e) {
      print('Logout Error: $e');
      throw Exception('Failed to log out: ${e.toString()}');
    } finally {
      // Logout process khatam hone par isLoading ko false karein
      _isLoading = false;
      notifyListeners();
    }
  }
}