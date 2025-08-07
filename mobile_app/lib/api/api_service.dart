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

  // Login function: Authenticates user and saves both access and refresh tokens locally.
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
        final refreshToken = responseBody['refreshToken']; // Get refresh token
        final prefs = await SharedPreferences.getInstance();
        final user = responseBody['user']['displayName'];
        final userEmail = responseBody['user']['email'];
        print("Access Token: $token"); // DEBUG: Print access token
        print("Refresh Token: $refreshToken"); // DEBUG: Print refresh token

        // Save both tokens with timestamp
        await prefs.setString('accessToken', token);
        await prefs.setString('refreshToken', refreshToken ?? '');
        await prefs.setString('email', userEmail); // Save email for future use
        await prefs.setString('name', user); // Save user name
        await prefs.setInt(
            'tokenTimestamp', DateTime.now().millisecondsSinceEpoch);

        print('Tokens saved: Access Token and Refresh Token stored');
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

  // Refresh the access token using the refresh token
  Future<String?> refreshAccessToken() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final refreshToken = prefs.getString('refreshToken');

      if (refreshToken == null || refreshToken.isEmpty) {
        print('No refresh token available');
        return null;
      }

      print('Attempting to refresh access token...');
      final response = await http.post(
        Uri.parse('$_baseUrl/auth/refresh'),
        headers: {'Content-Type': 'application/json; charset=UTF-8'},
        body: json.encode({'refreshToken': refreshToken}),
      );

      if (response.statusCode == 200) {
        final responseBody = json.decode(response.body);
        final newAccessToken =
            responseBody['accessToken'] ?? responseBody['token'];
        final newRefreshToken = responseBody['refreshToken'];

        if (newAccessToken != null) {
          // Update stored tokens
          await prefs.setString('accessToken', newAccessToken);
          if (newRefreshToken != null) {
            await prefs.setString('refreshToken', newRefreshToken);
          }
          await prefs.setInt(
              'tokenTimestamp', DateTime.now().millisecondsSinceEpoch);

          print('Access token refreshed successfully');
          return newAccessToken;
        }
      } else {
        print(
            'Token refresh failed with status: ${response.statusCode}, body: ${response.body}');
      }
    } catch (e) {
      print('Exception during token refresh: $e');
    }

    return null;
  }

  // Check if the current token is expired (considering 1-hour expiry)
  Future<bool> isTokenExpired() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final tokenTimestamp = prefs.getInt('tokenTimestamp');

      if (tokenTimestamp == null) {
        return true; // No timestamp means token is invalid
      }

      final tokenAge = DateTime.now().millisecondsSinceEpoch - tokenTimestamp;
      final oneHourInMs = 60 * 60 * 1000; // 1 hour in milliseconds

      // Consider token expired if it's older than 50 minutes (buffer of 10 minutes)
      return tokenAge > (oneHourInMs - 10 * 60 * 1000);
    } catch (e) {
      print('Error checking token expiry: $e');
      return true; // Default to expired on error
    }
  }

  // Common method to get headers with Authorization token, with automatic refresh
  Future<Map<String, String>> _getHeaders() async {
    final prefs = await SharedPreferences.getInstance();
    String? token = prefs.getString('accessToken') ??
        prefs.getString('token'); // Backward compatibility

    if (token == null) {
      print('Error: No access token found in SharedPreferences.');
      throw Exception('User not logged in. Token not found.');
    }

    // Check if token is expired and try to refresh
    if (await isTokenExpired()) {
      print('Access token is expired, attempting refresh...');
      final refreshedToken = await refreshAccessToken();

      if (refreshedToken != null) {
        token = refreshedToken;
        print('Successfully refreshed expired token');
      } else {
        print('Failed to refresh token, user needs to login again');
        throw Exception('Session expired. Please login again.');
      }
    }

    return {
      'Content-Type': 'application/json; charset=UTF-8',
      'Authorization': 'Bearer $token',
    };
  }

Future<void> completeBundleForTaluka(String taluka) async {
    // 1. Get the headers using its OWN private helper method
    final headers = await _getHeaders();

    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/data/bundles/complete'),
        // 2. Add the headers to the request
        headers: headers,
        // 3. Encode the body as JSON
        body: json.encode({'taluka': taluka}),
      );

      if (response.statusCode == 401) {
        throw Exception('Unauthorized: Token might be invalid. Please log in again.');
      }

      if (response.statusCode != 200) {
        throw Exception('Failed to mark bundle as complete. Server responded with ${response.statusCode}');
      }
    } catch (e) {
      print('Error in ApiService during completeBundleForTaluka: $e');
      rethrow; // Pass the error up
    }
  }
  // Enhanced method to make authenticated API calls with automatic retry on token expiry
  Future<http.Response> _makeAuthenticatedRequest(
    Future<http.Response> Function(Map<String, String> headers) requestFunction,
  ) async {
    try {
      final headers = await _getHeaders();
      final response = await requestFunction(headers);

      // If we get a 401, try refreshing token and retry once
      if (response.statusCode == 401) {
        print('Received 401, attempting token refresh and retry...');

        final refreshedToken = await refreshAccessToken();
        if (refreshedToken != null) {
          final newHeaders = {
            'Content-Type': 'application/json; charset=UTF-8',
            'Authorization': 'Bearer $refreshedToken',
          };
          final retryResponse = await requestFunction(newHeaders);

          if (retryResponse.statusCode == 401) {
            throw Exception('Session expired. Please login again.');
          }

          return retryResponse;
        } else {
          throw Exception('Session expired. Please login again.');
        }
      }

      return response;
    } catch (e) {
      print('Error in authenticated request: $e');
      rethrow;
    }
  }

  // Configuration data fetch karne ke liye (Districts, Talukas).
  // Calls backend endpoint: GET /api/data/config
  Future<Map<String, dynamic>> fetchConfig() async {
    try {
      final response = await _makeAuthenticatedRequest((headers) async {
        return await http.get(
          Uri.parse('$_baseUrl/data/config'),
          headers: headers,
        );
      });

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
      final response = await _makeAuthenticatedRequest((headers) async {
        return await http.post(
          Uri.parse('$_baseUrl/data/records/sync'),
          headers: headers,
          body: json.encode(syncData),
        );
      });

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
      final response = await _makeAuthenticatedRequest((headers) async {
        return await http.get(
          Uri.parse('$_baseUrl/data/bundles/active'),
          headers: headers,
        );
      });

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

  Future<String> getUserLocation() async {
    try {
      final response = await _makeAuthenticatedRequest((headers) async {
        return await http.get(
          Uri.parse('$_baseUrl/users/me'),
          headers: headers,
        );
      });

      if (response.statusCode == 200) {
        return json.decode(response.body)['location'] as String;
      } else {
        throw Exception('Failed to fetch user location: ${response.body}');
      }
    } catch (e) {
      print('Exception during getUserLocation: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getUserInfo() async {
    try {
      final response = await _makeAuthenticatedRequest((headers) async {
        return await http.get(
          Uri.parse('$_baseUrl/users/me'),
          headers: headers,
        );
      });

      if (response.statusCode == 200) {
        return json.decode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception('Failed to fetch user info: ${response.body}');
      }
    } catch (e) {
      print('Exception during getUserInfo: $e');
      rethrow;
    }
  }

  // Logout method that clears all stored tokens
  Future<void> logout() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove('accessToken');
      await prefs.remove('refreshToken');
      await prefs.remove(
          'token'); // Remove old token format for backward compatibility
      await prefs.remove('tokenTimestamp');
      await prefs.remove('email');
      await prefs.remove('name');
      print('All user tokens and data cleared successfully');
    } catch (e) {
      print('Error during logout: $e');
    }
  }

  // Check if user has valid authentication (either valid token or refresh token)
  Future<bool> isAuthenticated() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final accessToken =
          prefs.getString('accessToken') ?? prefs.getString('token');
      final refreshToken = prefs.getString('refreshToken');

      // User is authenticated if they have either a valid access token or a refresh token
      if (accessToken != null) {
        // If token is not expired, user is authenticated
        if (!(await isTokenExpired())) {
          return true;
        }
        // If token is expired but we have refresh token, try to refresh
        if (refreshToken != null && refreshToken.isNotEmpty) {
          final newToken = await refreshAccessToken();
          return newToken != null;
        }
      }

      return false;
    } catch (e) {
      print('Error checking authentication status: $e');
      return false;
    }
  }
}
