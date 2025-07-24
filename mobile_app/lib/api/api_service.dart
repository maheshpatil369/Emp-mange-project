// // api/api_service.dart
// // Backend se saari communication yahan hogi
// import 'dart:convert';
// import 'package:http/http.dart' as http;

// class ApiService {
//   // IMPORTANT: Yahan apne backend ka URL daalein
//   // Android emulator ke liye localhost ki jagah '10.0.2.2' use karein
//   final String _baseUrl = "http://10.0.2.2:8000/api";
//   String? _token;

//   // Login ke baad token set karne ke liye
//   void setToken(String token) {
//     _token = token;
//   }

//   // Login function
//   Future<Map<String, dynamic>> login(String email, String password) async {
//     // Abhi ke liye dummy response, isko aap apne real API se replace karein
//     await Future.delayed(const Duration(seconds: 1));
//     if (email.isNotEmpty && password.isNotEmpty) {
//       // Dummy token
//       _token = "dummy_jwt_token_for_testing";
//       return {'token': _token, 'user': {'name': 'Mahesh Patil', 'email': email}};
//     } else {
//       throw Exception('Login failed');
//     }
//   }
  
//   // Yahan aap baaki API calls (get bundles, sync data etc.) add kar sakte hain
// }



// lib/api/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  final String _baseUrl = 'http://127.0.0.1:8000/api'; // Windows App ke liye

  // Yahan badlaav kiya gaya hai
  Future<String> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      // 'username' ki jagah ab 'email' bhej rahe hain
      body: json.encode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final responseBody = json.decode(response.body);
      if (responseBody['success'] == true && responseBody['token'] != null) {
        return responseBody['token'];
      } else {
        throw Exception(responseBody['message'] ?? 'Invalid response from server.');
      }
    } else {
      throw Exception('Failed to login. Please check server logs.');
    }
  }

  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) {
      throw Exception('User not logged in. Token not found.');
    }
    return {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer $token',
    };
  }

  Future<List<dynamic>> downloadAssignedFile() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('$_baseUrl/data/assigned-file'),
      headers: headers,
    );

    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      return data['records'] ?? data['content'] ?? [];
    } else {
      throw Exception('Failed to download data: ${response.body}');
    }
  }

  Future<bool> syncProcessedRecords(Map<String, dynamic> syncData) async {
    final headers = await _getHeaders();
    final response = await http.post(
      Uri.parse('$_baseUrl/data/records/sync'),
      headers: headers,
      body: json.encode(syncData),
    );

    if (response.statusCode == 200 || response.statusCode == 201) {
       final responseBody = json.decode(response.body);
       return responseBody['success'] ?? false;
    } else {
      throw Exception('Failed to sync data: ${response.body}');
    }
  }
}