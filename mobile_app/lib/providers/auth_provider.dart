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


import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AuthProvider with ChangeNotifier {
  String? _token;

  bool get isLoggedIn => _token != null;
  String? get token => _token;

  Future<void> login(String token) async {
    _token = token;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('authToken', token);
    notifyListeners();
  }

  Future<void> logout() async {
    _token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('authToken');
    notifyListeners();
  }

  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    if (!prefs.containsKey('authToken')) {
      return;
    }
    _token = prefs.getString('authToken');
    notifyListeners();
  }
}
