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

import 'dart:convert';
import 'package:http/http.dart' as http;

class ApiService {
  // Apna backend URL yahan daalein
  final String _baseUrl = 'http://YOUR_BACKEND_IP_OR_DOMAIN/api';

  Future<String> login(String email, String password) async {
    final url = Uri.parse('$_baseUrl/auth/login'); // Maan lijiye aapka login endpoint yeh hai

    try {
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'email': email,
          'password': password,
        }),
      );

      if (response.statusCode == 200) {
        final responseData = json.decode(response.body);
        // Maan lijiye backend 'token' key mein token bhejta hai
        if (responseData.containsKey('token')) {
          return responseData['token'];
        } else {
          throw Exception('Token not found in response');
        }
      } else {
        // Server se aaye error message ko dikhayein
        final errorData = json.decode(response.body);
        throw Exception(errorData['message'] ?? 'Failed to login');
      }
    } catch (error) {
      // Network ya dusre errors ke liye
      throw Exception('An error occurred: ${error.toString()}');
    }
  }

  // Aapke data download/sync ke functions yahaan aayenge
  // Un sabhi functions mein authentication token bhejna zaroori hoga
}