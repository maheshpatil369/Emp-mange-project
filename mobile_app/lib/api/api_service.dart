// lib/api/api_service.dart
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiService {
  // Use environment configuration for base URL
  final String _baseUrl = dotenv.env['VITE_API_BASE_URL'] ??
      'https://emp-mange-project.onrender.com/api/data';
  // this production url refers to the backend url after hosting it

  // Login function: Authenticates user and saves the token locally.
  Future<String> login(String email, String password) async {
    final response = await http.post(
      Uri.parse('$_baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json; charset=UTF-8'},
      body: json.encode({'email': email, 'password': password}),
    );

    if (response.statusCode == 200) {
      final responseBody = json.decode(response.body);
      print(
          'Login API 200 OK. Response body: $responseBody'); // DEBUG: Print full response body

      if (responseBody['token'] != null) {
        final token = responseBody['token'];
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('token', token);
        print('Login successful, token saved: $token'); // Debugging print
        return token;
      } else {
        print(
            'Login API 200 OK, but token missing. Message: ${responseBody['message']}'); // DEBUG
        throw Exception(responseBody['message'] ??
            'Invalid response from server (token missing).');
      }
    } else {
      // Server se non-200 status code aane par error message
      print(
          'Login API failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
      throw Exception(
          'Failed to login. Status Code: ${response.statusCode}, Body: ${response.body}');
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
        Uri.parse('$_baseUrl/data/config'), // Fixed endpoint
        headers: headers,
      );

      print('Config API Response Status Code: ${response.statusCode}');
      print('Config API Response Body: ${response.body}');

      if (response.statusCode == 200) {
        final responseBody = json.decode(response.body);

        // Validate the response structure
        if (responseBody is! Map<String, dynamic>) {
          throw Exception(
              'Invalid response format. Expected a Map, got ${responseBody.runtimeType}');
        }

        // Optional: Add more specific validation if needed
        if (!responseBody.containsKey('locations') ||
            !responseBody.containsKey('talukas')) {
          throw Exception('Missing required configuration keys');
        }

        return responseBody;
      } else {
        print(
            'Fetch config failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
        throw Exception('Failed to load configuration: ${response.body}');
      }
    } catch (e, stackTrace) {
      print('Exception during fetchConfig: $e');
      print('Stacktrace: $stackTrace');
      rethrow; // Re-throw the exception to be caught by the provider
    }
  }

  // Work bundle assign karne ke liye.
  // Calls backend endpoint: POST /api/data/bundles/assign
  Future<Map<String, dynamic>> assignBundle(String taluka) async {
    try {
      final headers = await _getHeaders();
      final response = await http.post(
        Uri.parse('$_baseUrl/data/bundles/assign'),
        headers: headers,
        body: json.encode({'taluka': taluka}),
      );
      print('Assign bundle request body: ${json.encode({'taluka': taluka})}');

      if (response.statusCode != 200) {
        print(
            'Assign bundle failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
        throw Exception('Failed to assign bundle: ${response.body}');
      }

      // Parse and return the full response
      final responseBody = json.decode(response.body);
      print(
          'Bundle assigned successfully via API for taluka: $taluka'); // Debugging print
      return responseBody;
    } catch (e) {
      print('Exception during assignBundle: $e'); // Debugging print
      rethrow;
    }
  }

  // Assigned file download karne ke liye (records).
  // Calls backend endpoint: GET /api/data/assigned-file
  Future<List<Map<String, dynamic>>> fetchAssignedFile() async {
    final headers = await _getHeaders();
    final response = await http.get(
      Uri.parse('$_baseUrl/data/assigned-file'),
      headers: headers,
    );
    if (response.statusCode == 200) {
      final data = json.decode(response.body);
      if (data is List) {
        print("SEKO DA");
        return List<Map<String, dynamic>>.from(data);
      } else {
        throw Exception('Unexpected response format: $data');
      }
    } else {
      throw Exception('Failed to fetch assigned file: ${response.body}');
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
        print("response.body: ${response.body}");
        final responseBody = json.decode(response.body);
        final message = responseBody['message']?.toString() ?? '';
        print('Sync processed records successful: $message'); // Debugging print

        // Check if the message indicates success
        return message.toLowerCase().contains('successfully');
      } else {
        print(
            'Sync processed records failed with status: ${response.statusCode}, body: ${response.body}'); // Debugging print
        throw Exception('Failed to sync data: ${response.body}');
      }
    } catch (e) {
      print('Exception during syncProcessedRecords: $e'); // Debugging print
      rethrow;
    }
  }

  // Fetch user's active bundles from the server
  Future<Map<String, dynamic>> fetchActiveBundles() async {
    try {
      final headers = await _getHeaders();
      final response = await http.get(
        Uri.parse('$_baseUrl/data/bundles/active'),
        headers: headers,
      );

      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to fetch active bundles: ${response.body}');
      }
    } catch (e) {
      print('Exception during fetchActiveBundles: $e');
      rethrow;
    }
  }
}
