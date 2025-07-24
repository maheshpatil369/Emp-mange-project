// // providers/data_provider.dart
// // Download kiye hue data ko temporarily hold karne ke liye
// import 'package:flutter/foundation.dart';
// import '../models/member_model.dart';

// class DataProvider with ChangeNotifier {
//   List<Member> _members = [];
//   bool _isLoading = false;

//   List<Member> get members => _members;
//   bool get isLoading => _isLoading;

//   // Dummy data download karne ka function
//   Future<void> fetchData() async {
//     _isLoading = true;
//     notifyListeners();
    
//     // Yahan aap `api_service.getBundleData()` call karenge
//     await Future.delayed(const Duration(seconds: 2)); // API call ka simulation
//     _members = List.generate(
//       15,
//       (index) => Member(id: 'ID-${100 + index}', name: 'Member ${100 + index}'),
//     );
    
//     _isLoading = false;
//     notifyListeners();
//   }

//   // Data update karne ka function
//   void updateMemberStatus(String id, String newStatus) {
//     final index = _members.indexWhere((member) => member.id == id);
//     if (index != -1) {
//       _members[index].status = newStatus;
//       notifyListeners();
//     }
//   }
  
//   // Data sync karne ka function
//   Future<void> syncData() async {
//       _isLoading = true;
//       notifyListeners();
      
//       // Yahan aap `api_service.syncData(updatedMembers)` call karenge
//       await Future.delayed(const Duration(seconds: 2));
      
//       _isLoading = false;
//       notifyListeners();
//   }
// }


// lib/providers/auth_provider.dart
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/api_service.dart';

class AuthProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  String? _token;
  bool _isLoading = false;

  bool get isAuthenticated => _token != null;
  bool get isLoading => _isLoading;

  AuthProvider() {
    _tryAutoLogin();
  }

  Future<void> _tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    if (prefs.containsKey('token')) {
      _token = prefs.getString('token');
      notifyListeners();
    }
  }

  Future<bool> login(String username, String password) async {
    _isLoading = true;
    notifyListeners();
    try {
      final token = await _apiService.login(username, password);
      _token = token;
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      notifyListeners();
      return true;
    } catch (e) {
      debugPrint(e.toString());
      return false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('token');
    notifyListeners();
  }
}