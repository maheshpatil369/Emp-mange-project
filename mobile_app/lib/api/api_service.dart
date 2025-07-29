// lib/api/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class ApiService {
  // IMPORTANT: Yahan apne backend ka URL daalein.
  // Android emulator ke liye '10.0.2.2' use karein (ye aapke host machine ke localhost ko point karega).
  // Physical device ya web ke liye, apne backend ka public IP/domain use karein.
  final String _baseUrl = 'http://localhost:8000/api'; 

  // Login function: Authenticates user and saves the token locally.
  Future<String> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: json.encode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final responseBody = json.decode(response.body);
      print('Login API 200 OK. Response body: $responseBody'); // DEBUG: Print full response body

      if (responseBody['success'] == true && responseBody['token'] != null) {
        final token = responseBody['token'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token); // Login ke baad token SharedPreferences mein save karein
        print('Login successful, token saved: $token'); // Debugging print
        return token;
      } else {
        // This is where the "Login successful" exception might be coming from
        print('Login API 200 OK, but success:false or token missing. Message: ${responseBody['message']}'); // DEBUG
        throw Exception(responseBody['message'] ?? 'Invalid response from server (success:false or token missing).');
      }
    } else {
      // Server se non-200 status code aane par error message
      print('Login API failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
      throw Exception('Failed to login. Status Code: ${response.statusCode}, Body: ${response.body}');
    }
  }

  // Common method to get headers with Authorization token from SharedPreferences.
  // Used for all authenticated API calls.
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    final token = prefs.getString('token');
    if (token == null) {
      print('Error: Token not found in SharedPreferences.'); // Debugging print
      throw Exception('User not logged in. Token not found.');
    }
    return {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer $token',
    };
  }

  // Configuration data fetch karne ke liye (Districts, Talukas).
  // Calls backend endpoint: GET /api/data/config
  Future<Map<String, dynamic>> fetchConfig() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/data/config'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body);
      } else {
        print('Fetch config failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
        throw Exception('Failed to load configuration: ${response.body}');
      }
    } catch (e) {
      print('Exception during fetchConfig: $e'); // Debugging print
      rethrow; // Re-throw the exception to be caught by the provider
    }
  }

  // Work bundle assign karne ke liye.
  // Calls backend endpoint: POST /api/data/bundles/assign
  Future<void> assignBundle(String taluka) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/data/bundles/assign'),
        headers: headers,
        body: json.encode({'taluka': taluka}),
      );

      if (response.statusCode != 200) {
        print('Assign bundle failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
        throw Exception('Failed to assign bundle: ${response.body}');
      }
      print('Bundle assigned successfully via API for taluka: $taluka'); // Debugging print
    } catch (e) {
      print('Exception during assignBundle: $e'); // Debugging print
      rethrow;
    }
  }

  // Assigned file download karne ke liye (records).
  // Calls backend endpoint: GET /api/data/assigned-file
  Future<List<dynamic>> downloadAssignedFile() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/data/assigned-file'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        return data['records'] ?? data['content'] ?? []; 
      } else {
        print('Download assigned file failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
        throw Exception('Failed to download data: ${response.body}');
      }
    } catch (e) {
      print('Exception during downloadAssignedFile: $e'); // Debugging print
      rethrow;
    }
  }

  // Processed records sync karne ke liye.
  // Calls backend endpoint: POST /api/data/records/sync
  Future<bool> syncProcessedRecords(Map<String, dynamic> syncData) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/data/records/sync'),
        headers: headers,
        body: json.encode(syncData),
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
         final responseBody = json.decode(response.body);
         print('Sync processed records successful: ${responseBody['success']}'); // Debugging print
         return responseBody['success'] ?? false;
      } else {
        print('Sync processed records failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
        throw Exception('Failed to sync data: ${response.body}');
      }
    } catch (e) {
      print('Exception during syncProcessedRecords: $e'); // Debugging print
      rethrow;
    }
  }
}
