// lib/providers/data_provider.dart
// import 'dart:nativewrappers/_internal/vm/lib/internal_patch.dart';

import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../helpers/database_helper.dart';
import '../models/member_model.dart';
import '../services/connectivity_service.dart';
import 'package:sqflite/sqflite.dart';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DataProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final DatabaseHelper _databaseHelper = DatabaseHelper();

  // Configuration data structure
  List<Map<String, dynamic>> _fullLocationData = [];
  String? _selectedDistrictSlug;
  // Getters
  List<Map<String, String>> get districts {
    if (_fullLocationData.isEmpty) return [];
    print('Fetching districts from fullLocationData');
    return _fullLocationData.map((loc) {
      print('District: ${loc['name']}, Slug: ${loc['slug']}');
      return {
        'name': loc['name'] as String,
        'slug': loc['slug'] as String,
      };
    }).toList();
  }

  List<String> get filteredTalukas {
    // Return all talukas if no district is selected
    if (_selectedDistrictSlug == null) {
      return _fullLocationData
          .expand(
              (loc) => (loc['talukas'] as List?)?.cast<String>() ?? <String>[])
          .toList();
    }

    // Find talukas for the selected district
    final selected = _fullLocationData.firstWhere(
      (loc) => loc['slug'] == _selectedDistrictSlug,
      orElse: () => {'talukas': <String>[]},
    );
    print(
        'Filtered talukas for district $_selectedDistrictSlug: ${selected['talukas']}');

    return List<String>.from(selected['talukas'] ?? []);
  }

  final String _baseUrl = dotenv.env['VITE_API_BASE_URL'] ??
      'https://emp-mange-project.onrender.com/api/data';

  bool _isLoadingConfig = false;
  bool _isAssigningBundle = false;
  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  final List<Member> _records = [];
  List<Map<String, dynamic>> _serverBundles = [];
  bool _isLoadingBundles = false;
  final bool _isLoadingRecords = false;

  // Getters
  List<Member> get records => _records;
  List<Map<String, dynamic>> get serverBundles => _serverBundles;
  bool get isLoadingRecords => _isLoadingRecords;
  bool get isLoadingConfig => _isLoadingConfig;
  bool get isAssigningBundle => _isAssigningBundle;
  bool get isLoadingBundles => _isLoadingBundles;
  bool get isOffline => connectivityService.isOffline;
  List<Map<String, dynamic>> get fullLocationData => _fullLocationData;

  // Modify the constructor to print database path
  DataProvider() {
    loadConfig();
    // Don't load bundles automatically - will be loaded after authentication
  }

  // To correctly process the API response
  Future<void> loadConfig() async {
    _isLoadingConfig = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Try to load from SharedPreferences first (offline fallback)
      await _loadConfigFromPrefs();

      // Try to fetch fresh data from API
      final responseData = await _apiService.fetchConfig();

      // Safely extract data with null checks
      final locations = responseData['locations'] ??
          responseData['config']?['locations'] ??
          [];
      final talukasInfo = responseData['talukas'] ?? [];

      // Create a lookup map for talukas by their locationSlug
      final Map<String, List<String>> talukasMap = {};
      for (var talukaGroup in talukasInfo) {
        final slug = talukaGroup['locationSlug'];
        if (slug != null) {
          final talukaList = List<String>.from(talukaGroup['talukas'] ?? []);
          talukasMap[slug] = talukaList;
        }
      }

      // Merge locations with their corresponding talukas
      _fullLocationData = List<Map<String, dynamic>>.from(locations.map((loc) {
        final slug = loc['slug'];
        return {
          'name': loc['name'] ?? '',
          'slug': slug ?? '',
          'talukas': talukasMap[slug] ?? [], // Find talukas using the slug
        };
      }));

      // Set first district as default if available
      if (_fullLocationData.isNotEmpty) {
        _selectedDistrictSlug = _fullLocationData.first['slug'];
      }

      // Save to SharedPreferences for offline access
      await _saveConfigToPrefs();

      print('Loaded Location Data: $_fullLocationData');
      print('Talukas Map: $talukasMap');
    } catch (e, stackTrace) {
      _errorMessage = 'Failed to load configuration: ${e.toString()}';
      print('Configuration Load Error: $_errorMessage');
      print('Stacktrace: $stackTrace');

      // If API fails but we have no cached data, _fullLocationData will remain empty
      // The generateUniqueId method will use hardcoded fallbacks in this case
      if (_fullLocationData.isEmpty) {
        print(
            'No cached config data available, unique ID generation will use hardcoded fallbacks');
      }
    } finally {
      _isLoadingConfig = false;
      notifyListeners();
    }
  }

  // Load configuration from SharedPreferences (offline fallback)
  Future<void> _loadConfigFromPrefs() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final configJson = prefs.getString('locationConfig');

      if (configJson != null) {
        final configData = json.decode(configJson) as List;
        _fullLocationData = List<Map<String, dynamic>>.from(configData);

        if (_fullLocationData.isNotEmpty) {
          _selectedDistrictSlug = _fullLocationData.first['slug'];
        }

        print(
            'Loaded ${_fullLocationData.length} locations from SharedPreferences cache');
      }
    } catch (e) {
      print('Error loading config from SharedPreferences: $e');
    }
  }

  // Save configuration to SharedPreferences
  Future<void> _saveConfigToPrefs() async {
    try {
      if (_fullLocationData.isNotEmpty) {
        final prefs = await SharedPreferences.getInstance();
        final configJson = json.encode(_fullLocationData);
        await prefs.setString('locationConfig', configJson);
        print('Configuration saved to SharedPreferences cache');
      }
    } catch (e) {
      print('Error saving config to SharedPreferences: $e');
    }
  }

  Future<void> fetchAndSyncBundles() async {
    _isLoadingBundles = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // 1. First, try to load from SharedPreferences (preserves counts)
      final userEmail = await _getCurrentUserEmail();
      String? bundlesJson;

      if (userEmail != null) {
        final prefs = await SharedPreferences.getInstance();
        bundlesJson = prefs.getString('activeBundles_$userEmail');
        print('Loading bundles for user: $userEmail');
      }

      if (bundlesJson != null) {
        print('Loading bundles from SharedPreferences first...');
        final savedBundles = (json.decode(bundlesJson) as List)
            .map((item) => item as Map<String, dynamic>)
            .toList();

        // Load saved bundles into local database if not already there
        final localBundles = await _databaseHelper.getActiveLocalBundles();
        if (localBundles.isEmpty && savedBundles.isNotEmpty) {
          for (var bundle in savedBundles) {
            await _databaseHelper.insertBundle(bundle);
          }
          print(
              'Restored ${savedBundles.length} bundles from SharedPreferences to local DB');
        }
      }

      // 2. Always load local bundles first for immediate UI display
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
      notifyListeners(); // Show local data immediately

      // 3. Try to sync with server in background (but preserve local counts)
      final serverResponse = await _apiService.fetchActiveBundles().timeout(
        const Duration(seconds: 10),
        onTimeout: () {
          throw TimeoutException('Server request timed out');
        },
      );

      // If response only contains a 'message', treat as no bundles
      if (serverResponse.containsKey('message') && serverResponse.length == 1) {
        print('No active bundles for user on server.');
        _isLoadingBundles = false;
        notifyListeners();
        return;
      }

      final serverBundlesList = serverResponse.values
          .map<Map<String, dynamic>>((v) => Map<String, dynamic>.from(v))
          .toList();

      // 4. Sync server data with local data (but ALWAYS preserve local counts)
      final localBundles = await _databaseHelper.getActiveLocalBundles();
      final localBundlesMap = {for (var b in localBundles) b['bundleNo']: b};

      // 5. Apply changes to the local database (but preserve local counts)
      final bundlesToUpdate = <Map<String, dynamic>>[];
      final bundlesToAdd = <Map<String, dynamic>>[];

      // Check server bundles against local ones
      for (var serverBundle in serverBundlesList) {
        final bundleNo = serverBundle['bundleNo'];
        if (localBundlesMap.containsKey(bundleNo)) {
          // Bundle exists locally - ALWAYS preserve local count and assignedAt
          final localBundle = localBundlesMap[bundleNo]!;
          final updatedBundle = Map<String, dynamic>.from(serverBundle);
          updatedBundle['count'] = localBundle['count']; // PRESERVE local count
          updatedBundle['assignedAt'] =
              localBundle['assignedAt']; // PRESERVE assignedAt

          // Only update if there are actual changes (excluding count and assignedAt)
          bool needsUpdate = false;
          ['taluka', 'status'].forEach((field) {
            if (serverBundle[field] != localBundle[field]) {
              needsUpdate = true;
            }
          });

          if (needsUpdate) {
            bundlesToUpdate.add(updatedBundle);
            print(
                'Preserving local count ${localBundle['count']} for bundle ${bundleNo}');
          }
        } else {
          // New bundle from server - use server count (usually 0) only for new bundles
          serverBundle['count'] =
              serverBundle['count'] ?? 0; // Ensure count is not null
          bundlesToAdd.add(serverBundle);
          print(
              'Adding new bundle ${bundleNo} from server with count ${serverBundle['count']}');
        }
      }

      // Apply changes
      for (var bundle in bundlesToAdd) {
        await _databaseHelper.insertBundle(bundle);
      }
      for (var bundle in bundlesToUpdate) {
        await _databaseHelper.updateBundle(bundle);
      }

      // 6. Refresh local state and show updated data
      _serverBundles = await _databaseHelper.getActiveLocalBundles();

      // 7. Save the synced bundles to SharedPreferences (with preserved counts)
      await _saveBundlesToPrefs(_serverBundles);

      print(
          'Successfully synced bundles with server while preserving local counts.');
    } catch (e) {
      _errorMessage =
          'Failed to sync with server. Showing local data: ${e.toString()}';
      print('Error syncing with server, using local data: $e');
      // Use local data as fallback
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
    } finally {
      _isLoadingBundles = false;
      notifyListeners();
    }
  }

  // The original fetchServerBundles is now replaced by the logic in fetchAndSyncBundles
  Future<void> fetchServerBundles() async {
    await fetchAndSyncBundles();
  }

  Future<bool> deleteAllLocalBundles() async {
    try {
      final db = await _databaseHelper.database;
      await db
          .delete('bundles'); // Replace 'bundles' with your actual table name
      print('All bundles deleted from local database.');
      notifyListeners();
      return true;
    } catch (e) {
      print('Error deleting bundles: $e');
      return false;
    }
  }

  // Method to assign work bundle and store locally
  Future<String> assignWorkBundle(String taluka) async {
    _isAssigningBundle = true;
    _errorMessage = null;
    notifyListeners();

    try {
      // Ensure taluka is a clean string
      final cleanTaluka = taluka.trim();
      print('Assigning bundle for taluka: $cleanTaluka');

      if (cleanTaluka.isEmpty) {
        throw Exception('Taluka cannot be empty');
      }

      // Check if a bundle for this taluka already exists locally first
      print("Checking if bundle exists locally for taluka: $cleanTaluka");
      final localBundles = await _databaseHelper.getActiveLocalBundles();
      final existsLocally =
          localBundles.any((bundle) => bundle['taluka'] == cleanTaluka);

      if (existsLocally) {
        return ('Bundle already exists locally for this taluka');
      }

      // Check if a bundle for this taluka already exists on server
      print("Checking if bundle exists on server for taluka: $cleanTaluka");
      if (await _apiService
          .fetchActiveBundles()
          .then((bundles) => bundles.containsKey(cleanTaluka))) {
        return ('Bundle already exists on server for this taluka');
      }
      // Call API to assign bundle
      final bundleResponse = await _apiService.assignBundle(cleanTaluka);

      // Parse bundle details from API response
      final bundleData = {
        'bundleNo': bundleResponse['bundle']['bundleNo'],
        'taluka': cleanTaluka,
        'status': 'active'
      };
      // Store bundle in local db
      await _databaseHelper.insertBundle(bundleData);

      // Refresh local bundles and save to SharedPreferences
      await refreshLocalBundles();
      await _saveBundlesToPrefs(_serverBundles);

      _errorMessage = null;
      print('Bundle assigned and stored successfully for $cleanTaluka');
      return 'Bundle assigned successfully for $cleanTaluka';
    } catch (e) {
      _errorMessage = 'Failed to assign bundle: ${e.toString()}';
      print(_errorMessage);
      return _errorMessage.toString();
    } finally {
      _isAssigningBundle = false;
      notifyListeners();
    }
  }

  // Method to fetch active bundles from local database
  // Future<List<Map<String, dynamic>>> getLocalBundles() async {
  //   try {
  //     print("Fetching active bundles from local database");
  //     final activeBundles = await _databaseHelper.getActiveLocalBundles();
  //     print("Found ${activeBundles.length} active bundles");
  //     return activeBundles;
  //   } catch (e) {
  //     print('Error fetching active bundles: $e');
  //     return [];
  //   }
  // }

  Future<void> refreshLocalBundles() async {
    try {
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
      notifyListeners();
      print('Local bundles refreshed for UI display');
    } catch (e) {
      print('Error refreshing local bundles: $e');
    }
  }

  //number of records in the device locally
  Future<int> getLocalRecordCount() async {
    try {
      final db = await _databaseHelper.database;
      final result =
          await db.rawQuery('SELECT COUNT(*) as count FROM raw_records');
      return Sqflite.firstIntValue(result) ?? 0;
    } catch (e) {
      print('Error getting local record count: $e');
      return 0;
    }
  }

  // Delete ALL existing entries in local database
  Future<void> deleteAllLocalRecords() async {
    try {
      final db = await _databaseHelper.database;
      await db.delete('raw_records');
      notifyListeners();
      print('All local records deleted from raw_records table.');
    } catch (e) {
      print('Error deleting local records: $e');
    }
  }

  Future<String> downloadAndStoreAssignedRecords() async {
    try {
      final records = await _apiService.fetchAssignedFile();
      print('Fetched ${records.length} records from server.');
      print(" Records: ${records[0]}");

      if (records.isEmpty) {
        return 'No records to download from server.';
      }
      print('Downloading ${records.length} records from server...');

      // NEW LOGIC: Check if any of the fetched records already exist locally
      if (await _databaseHelper.checkIfAnyRecordExists(records)) {
        print('Records are already downloaded (batch detected as duplicate).');
        return 'Records are already downloaded (batch detected as duplicate).';
      }

      await _databaseHelper.insertRawRecords(records);
      print('Records downloaded and stored locally.');
      notifyListeners();
      return 'Records downloaded and stored locally!';
    } catch (e) {
      print('Error downloading/storing assigned records: $e');
      return 'Failed to download records: ${e.toString()}';
    }
  }

  // Method to update bundle status
  Future<void> updateBundleStatus(int bundleNo, String status) async {
    try {
      print("Updating bundle $bundleNo status to $status");
      await _databaseHelper.updateBundleStatus(bundleNo, status);
    } catch (e) {
      print('Error updating bundle status: $e');
    }
  }

  // Search through local raw records by "Search from" field with partial matching
  Future<List<Map<String, dynamic>>> searchLocalRecords(String query) async {
    try {
      if (query.trim().isEmpty) {
        return [];
      }

      final cleanQuery = query.trim();
      final results = await _databaseHelper.searchRawRecords(cleanQuery);
      print(
          'Found ${results.length} records containing "$cleanQuery" in "Search from" field');
      return results;
    } catch (e) {
      print('Error searching local records: $e');
      return [];
    }
  }

  // Hardcoded mappings for location and taluka abbreviations
  static const Map<String, String> _locationAbbreviations = {
    'ahilyanagar': 'AN',
    'chhatrapati-sambhajinagar': 'CS',
  };

  static const Map<String, String> _talukaAbbreviations = {
    // Ahilyanagar talukas
    'Jamkhed': 'JA',
    'Karjat': 'KA',
    'Kopargaon': 'KO',
    'Nevasa': 'NE',
    'Parner': 'PA',
    'Pathardi': 'PT',
    'Rahata': 'RA',
    'Rahuri': 'RH',
    'Sangamner': 'SA',
    'Shevgaon': 'SH',
    'Shrirampur': 'SR',
    'Shrigonda': 'SG',
    'Akole': 'AK',
    'Nagar': 'NA',

    // Chhatrapati Sambhajinagar talukas
    'Aurangabad': 'AU',
    'Gangapur': 'GA',
    'Kannad': 'KN',
    'Khultabad': 'KH',
    'Paithan': 'PA',
    'Sillod': 'SI',
    'Vaijapur': 'VA',
    'Phulambri': 'PH',
    'Soegaon': 'SO',
  };

  // Hardcoded fallback mapping for taluka to location slug (used in offline mode)
  static const Map<String, String> _talukaToLocationMapping = {
    // Ahilyanagar talukas
    'Ahmednagar': 'ahilyanagar',
    'Jamkhed': 'ahilyanagar',
    'Karjat': 'ahilyanagar',
    'Kopargaon': 'ahilyanagar',
    'Nevasa': 'ahilyanagar',
    'Parner': 'ahilyanagar',
    'Pathardi': 'ahilyanagar',
    'Rahata': 'ahilyanagar',
    'Rahuri': 'ahilyanagar',
    'Sangamner': 'ahilyanagar',
    'Shevgaon': 'ahilyanagar',
    'Shirdi': 'ahilyanagar',
    'Shrigonda': 'ahilyanagar',
    'Akole': 'ahilyanagar',

    // Chhatrapati Sambhajinagar talukas
    'Aurangabad': 'chhatrapati-sambhajinagar',
    'Gangapur': 'chhatrapati-sambhajinagar',
    'Kannad': 'chhatrapati-sambhajinagar',
    'Khultabad': 'chhatrapati-sambhajinagar',
    'Paithan': 'chhatrapati-sambhajinagar',
    'Sillod': 'chhatrapati-sambhajinagar',
    'Vaijapur': 'chhatrapati-sambhajinagar',
    'Phulambri': 'chhatrapati-sambhajinagar',
    'Soegaon': 'chhatrapati-sambhajinagar',
  };

  Future<void> completeBundleForTaluka(String taluka) async {
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/data/bundles/complete'),
        body: {'taluka': taluka},
      );

      if (response.statusCode != 200) {
        throw Exception('Failed to mark bundle as complete');
      }

      // Update local bundle status
      await refreshLocalBundles();
    } catch (e) {
      print('Error completing bundle: $e');
      rethrow;
    }
  }

// 1. First, let's add a method to get the highest sequence number for a taluka
  Future<int> _getHighestSequenceNumberForTaluka(String taluka) async {
    try {
      // Check both temporary records and permanent records for highest sequence
      final db = await _databaseHelper.database;

      // Get all records for this taluka from temporary sync table
      final tempRecords = await db.query(
        'temporary_sync',
        where: 'json_extract(data, "\$.Taluka") = ?',
        whereArgs: [taluka],
      );

      // Get all records for this taluka from raw_records table
      final rawRecords = await db.query(
        'raw_records',
        where:
            'json_extract(data, "\$.Taluka") = ? AND json_extract(data, "\$.UniqueId") IS NOT NULL',
        whereArgs: [taluka],
      );

      int highestSequence = 0;

      // Process temp records
      for (final record in tempRecords) {
        try {
          final data = json.decode(record['data'] as String);
          final uniqueId = data['UniqueId']?.toString();
          if (uniqueId != null && uniqueId.isNotEmpty) {
            final sequence = _extractSequenceFromUniqueId(uniqueId, taluka);
            if (sequence > highestSequence) {
              highestSequence = sequence;
            }
          }
        } catch (e) {
          print('Error processing temp record: $e');
        }
      }

      // Process raw records
      for (final record in rawRecords) {
        try {
          final data = json.decode(record['data'] as String);
          final uniqueId = data['UniqueId']?.toString();
          if (uniqueId != null && uniqueId.isNotEmpty) {
            final sequence = _extractSequenceFromUniqueId(uniqueId, taluka);
            if (sequence > highestSequence) {
              highestSequence = sequence;
            }
          }
        } catch (e) {
          print('Error processing raw record: $e');
        }
      }

      print('Highest sequence found for taluka $taluka: $highestSequence');
      return highestSequence;
    } catch (e) {
      print('Error getting highest sequence for taluka $taluka: $e');
      return 0;
    }
  }

// 2. Helper method to extract sequence number from existing UniqueId
  int _extractSequenceFromUniqueId(String uniqueId, String taluka) {
    try {
      // Find location and taluka abbreviations for this taluka
      String? locationSlug;

      // Try to find from loaded configuration
      if (_fullLocationData.isNotEmpty) {
        for (final location in _fullLocationData) {
          final talukas = List<String>.from(location['talukas'] ?? []);
          if (talukas.contains(taluka)) {
            locationSlug = location['slug'];
            break;
          }
        }
      }

      // Fallback to hardcoded mapping
      if (locationSlug == null) {
        locationSlug = _talukaToLocationMapping[taluka];
      }

      if (locationSlug == null) return 0;

      final locationAbbr = _locationAbbreviations[locationSlug];
      final talukaAbbr = _talukaAbbreviations[taluka];

      if (locationAbbr == null || talukaAbbr == null) return 0;

      // Expected format: LocationAbbrTalukaAbbrSequenceNumber
      final prefix = '$locationAbbr$talukaAbbr';
      if (uniqueId.startsWith(prefix) && uniqueId.length > prefix.length) {
        final sequenceStr = uniqueId.substring(prefix.length);
        return int.tryParse(sequenceStr) ?? 0;
      }

      return 0;
    } catch (e) {
      print('Error extracting sequence from UniqueId $uniqueId: $e');
      return 0;
    }
  }

// 3. Updated generateUniqueId method (no longer increments count)
  Future<String> generateUniqueId(Map<String, dynamic> record) async {
    try {
      final talukaName = record['Taluka']?.toString().trim();
      if (talukaName == null || talukaName.isEmpty) {
        throw Exception('Taluka name is required for generating unique ID');
      }

      print('Generating unique ID for taluka: $talukaName');

      // Get taluka abbreviation
      final talukaAbbr = _talukaAbbreviations[talukaName];
      if (talukaAbbr == null) {
        throw Exception('No abbreviation found for taluka: $talukaName');
      }

      String? locationSlug;

      // Try to find location slug from loaded configuration data first
      if (_fullLocationData.isNotEmpty) {
        for (final location in _fullLocationData) {
          final talukas = List<String>.from(location['talukas'] ?? []);
          if (talukas.contains(talukaName)) {
            locationSlug = location['slug'];
            break;
          }
        }
      }

      // If not found in loaded data, use hardcoded fallback mapping
      if (locationSlug == null) {
        locationSlug = _talukaToLocationMapping[talukaName];
        print(
            'Using fallback location mapping for taluka: $talukaName -> $locationSlug');
      }

      if (locationSlug == null) {
        throw Exception('Location not found for taluka: $talukaName');
      }

      final locationAbbr = _locationAbbreviations[locationSlug];
      if (locationAbbr == null) {
        throw Exception('No abbreviation found for location: $locationSlug');
      }

      // Get next sequence number based on highest existing sequence
      final nextSequence = await _getNextSequenceNumber(talukaName);

      final uniqueId = '$locationAbbr$talukaAbbr$nextSequence';
      print('Generated unique ID: $uniqueId for taluka: $talukaName');

      return uniqueId;
    } catch (e) {
      print('Error generating unique ID: $e');
      rethrow;
    }
  }

// 4. Updated _getNextSequenceNumber method (uses highest sequence, doesn't increment count)
  Future<int> _getNextSequenceNumber(String taluka) async {
    try {
      // Get the highest existing sequence number for this taluka
      final highestSequence = await _getHighestSequenceNumberForTaluka(taluka);

      // If no existing sequences found, calculate based on bundle number and count
      if (highestSequence == 0) {
        final db = await _databaseHelper.database;
        final result = await db.query(
          'bundles',
          where: 'taluka = ? AND status = ?',
          whereArgs: [taluka, 'active'],
          limit: 1,
        );

        if (result.isNotEmpty) {
          final bundle = result.first;
          final bundleNo = (bundle['bundleNo'] ?? 1) as int;
          final count = (bundle['count'] ?? 0) as int;

          // Calculate starting sequence for this bundle
          final baseSequence = (bundleNo - 1) * 250;

          // Return the next sequence after the current count
          return baseSequence + count + 1;
        } else {
          throw Exception('No bundle found for taluka: $taluka');
        }
      }

      // Return next sequence after the highest found
      return highestSequence + 1;
    } catch (e) {
      print('Error getting next sequence number for taluka $taluka: $e');
      rethrow;
    }
  }

// 5. Updated saveRecordToSync method with duplicate prevention
  Future<bool> saveRecordToSync(Map<String, dynamic> record) async {
    try {
      // Check if record with same UniqueId already exists in temp table
      if (record['UniqueId'] != null) {
        final existingRecords = await _databaseHelper.getRecordsToSync();
        final isDuplicate = existingRecords.any((existingRecord) =>
            existingRecord['UniqueId'] == record['UniqueId']);

        if (isDuplicate) {
          print(
              'Record with UniqueId ${record['UniqueId']} already exists in temporary storage');
          return false; // Don't save duplicate
        }
      }

      // Check if record with same 'Search from' already exists
      final searchFrom = record['Search from'];
      if (searchFrom != null) {
        final existingRecords = await _databaseHelper.getRecordsToSync();
        final isDuplicateSearchFrom = existingRecords.any(
            (existingRecord) => existingRecord['Search from'] == searchFrom);

        if (isDuplicateSearchFrom) {
          print(
              'Record with Search from $searchFrom already exists in temporary storage');
          return false; // Don't save duplicate
        }
      }

      final success_temp = await _databaseHelper.saveRecordToSync(record);
      final success_permanent = await _databaseHelper.updateRecordWithUniqueId(
          record['Search from'], record['UniqueId'] ?? record['UniqueId']);

      if (success_temp && success_permanent) {
        notifyListeners();
      }

      return success_temp && success_permanent;
    } catch (e) {
      print('Error saving record to sync: $e');
      return false;
    }
  }

// 6. Updated incrementBundleCount method (only called after successful save)
  Future<void> incrementBundleCount(String taluka) async {
    final db = await _databaseHelper.database;
    final result = await db.query(
      'bundles',
      where: 'taluka = ? AND status = ?',
      whereArgs: [taluka, 'active'],
      limit: 1,
    );

    if (result.isNotEmpty) {
      final bundle = result.first;
      final bundleNo = (bundle['bundleNo'] ?? 1) as int;
      final currentCount = (bundle['count'] ?? 0) as int;

      print(
          'BEFORE INCREMENT: Bundle $bundleNo, Taluka: $taluka, Count: $currentCount');

      // Increment count immediately in local database
      final updateResult = await db.update(
        'bundles',
        {'count': currentCount + 1},
        where: 'bundleNo = ? AND taluka = ?',
        whereArgs: [bundleNo, taluka],
      );

      print('Local count updated: $updateResult rows affected');

      // Immediately refresh local bundles for UI
      await refreshLocalBundles();

      // Save updated bundles to SharedPreferences immediately
      await _saveBundlesToPrefs(_serverBundles);

      print(
          'Incremented local count for taluka: $taluka, new count: ${currentCount + 1}');
      print('Updated bundles saved to SharedPreferences');
    } else {
      throw Exception('No active bundle found for taluka: $taluka');
    }
  }

  // Get records from temporary sync table
  Future<List<Map<String, dynamic>>> getRecordsToSync() async {
    try {
      return await _databaseHelper.getRecordsToSync();
    } catch (e) {
      print('Error getting records to sync: $e');
      return [];
    }
  }

  // Get count of records in temporary sync table
  Future<int> getRecordsToSyncCount() async {
    try {
      return await _databaseHelper.getRecordsToSyncCount();
    } catch (e) {
      print('Error getting records to sync count: $e');
      return 0;
    }
  }

  // Sync records to server
  Future<bool> syncRecordsToServer() async {
    try {
      final records = await _databaseHelper.getRecordsToSync();

      if (records.isEmpty) {
        print('No records to sync');
        return false;
      }

      // Group records by taluka for proper sync data
      final Map<String, List<Map<String, dynamic>>> recordsByTaluka = {};
      for (final record in records) {
        final taluka = record['Taluka']?.toString() ?? 'Unknown';
        recordsByTaluka.putIfAbsent(taluka, () => []).add(record);
      }

      // Sync each taluka's records separately (or send all together - depends on your API)
      for (final entry in recordsByTaluka.entries) {
        final taluka = entry.key;
        final talukaRecords = entry.value;

        // Get bundle info for this taluka
        final db = await _databaseHelper.database;
        final bundleResult = await db.query(
          'bundles',
          where: 'taluka = ? AND status = ?',
          whereArgs: [taluka, 'active'],
          limit: 1,
        );

        if (bundleResult.isNotEmpty) {
          final bundle = bundleResult.first;
          final syncData = {
            'taluka': taluka,
            'bundleNo': bundle['bundleNo'],
            'sourceFile': 'mobile_app_processed',
            'records': talukaRecords,
          };

          print('Syncing ${talukaRecords.length} records for taluka: $taluka');
          final success = await _apiService.syncProcessedRecords(syncData);

          if (!success) {
            print('Failed to sync records for taluka: $taluka');
            return false;
          }
        }
      }

      // Clear temp table only if all syncs were successful
      await _databaseHelper.clearRecordsToSync();
      notifyListeners();
      print('All records synced successfully and temporary table cleared');
      return true;
    } catch (e) {
      print('Error syncing records to server: $e');
      return false;
    }
  }

  // Empty temporary table manually
  Future<bool> emptyTempTable() async {
    try {
      await _databaseHelper.clearRecordsToSync();
      notifyListeners();
      print('Temporary table emptied manually');
      return true;
    } catch (e) {
      print('Error emptying temp table: $e');
      return false;
    }
  }

  // Get current user's email from SharedPreferences
  Future<String?> _getCurrentUserEmail() async {
    final prefs = await SharedPreferences.getInstance();
    return prefs.getString('email');
  }

  // Save active bundles to SharedPreferences (user-specific)
  Future<void> _saveBundlesToPrefs(List<Map<String, dynamic>> bundles) async {
    final userEmail = await _getCurrentUserEmail();
    if (userEmail != null) {
      final prefs = await SharedPreferences.getInstance();
      final bundlesJson = json.encode(bundles);
      await prefs.setString('activeBundles_$userEmail', bundlesJson);
      print('Active bundles saved to SharedPreferences for user: $userEmail');
    } else {
      print('No user email found, cannot save user-specific bundles');
    }
  }

  // Load bundles from SharedPreferences and overwrite local DB
  // Future<void> loadBundlesFromPrefsAndOverwriteDB() async {
  //   print('Loading bundles from SharedPreferences and overwriting local DB...');
  //   final userEmail = await _getCurrentUserEmail();
  //   String? bundlesJson;

  //   if (userEmail != null) {
  //     final prefs = await SharedPreferences.getInstance();
  //     bundlesJson = prefs.getString('activeBundles_$userEmail');
  //     print('Loading bundles for user: $userEmail');
  //   }

  //   if (bundlesJson != null) {
  //     // 1. Decode the JSON string to a list of maps
  //     final bundles = (json.decode(bundlesJson) as List)
  //         .map((item) => item as Map<String, dynamic>)
  //         .toList();

  //     // 2. Clear the existing local bundles table
  //     await deleteAllLocalBundles();
  //     print('Local bundles table cleared.');

  //     // 3. Insert the bundles from SharedPreferences into the local DB
  //     for (var bundle in bundles) {
  //       await _databaseHelper.insertBundle(bundle);
  //     }
  //     print('Local DB overwritten with data from SharedPreferences.');

  //     // 4. Refresh the state to reflect the new data
  //     await refreshLocalBundles();
  //   } else {
  //     print('No bundles found in SharedPreferences.');
  //   }
  // }

  // Load bundles from SharedPreferences without server sync (for app startup)
  Future<void> loadBundlesFromPrefs() async {
    print('Loading bundles from SharedPreferences for app startup...');
    final userEmail = await _getCurrentUserEmail();

    if (userEmail == null) {
      print('No user authenticated, skipping bundle loading');
      return;
    }

    final prefs = await SharedPreferences.getInstance();
    final bundlesJson = prefs.getString('activeBundles_$userEmail');
    print('Loading bundles for user: $userEmail');

    if (bundlesJson != null) {
      try {
        // 1. Decode the JSON string to a list of maps
        final savedBundles = (json.decode(bundlesJson) as List)
            .map((item) => item as Map<String, dynamic>)
            .toList();

        // 2. Check current local bundles
        final localBundles = await _databaseHelper.getActiveLocalBundles();
        final localBundlesMap = {for (var b in localBundles) b['bundleNo']: b};

        if (savedBundles.isNotEmpty) {
          // 3. Merge saved bundles with existing local bundles (preserve counts)
          for (var savedBundle in savedBundles) {
            final bundleNo = savedBundle['bundleNo'];
            if (localBundlesMap.containsKey(bundleNo)) {
              // Bundle exists locally - preserve local count
              final localBundle = localBundlesMap[bundleNo]!;
              savedBundle['count'] =
                  localBundle['count']; // Preserve local count
              await _databaseHelper.updateBundle(savedBundle);
            } else {
              // New bundle from preferences
              await _databaseHelper.insertBundle(savedBundle);
            }
          }
          print(
              'Merged ${savedBundles.length} bundles from SharedPreferences with local DB');
        }

        // 4. Update the UI state
        _serverBundles = await _databaseHelper.getActiveLocalBundles();
        notifyListeners();
        print('Local bundles loaded: ${_serverBundles.length} bundles');
      } catch (e) {
        print('Error loading bundles from SharedPreferences: $e');
        // Fallback to local database
        _serverBundles = await _databaseHelper.getActiveLocalBundles();
        notifyListeners();
      }
    } else {
      print('No bundles found in SharedPreferences.');
      // Still load whatever is in the local database
      _serverBundles = await _databaseHelper.getActiveLocalBundles();
      notifyListeners();
    }
  }
  // Modify fetchLocalData to attempt sample record insertion if no records found
  // Future<void> fetchLocalData() async {
  //   _isLoadingRecords = true;
  //   _errorMessage = null;
  //   notifyListeners();
  //   try {
  //     print("GetRecords start");
  //     _records = await _databaseHelper.getLocalRecords();
  //     print("GetRecords end");
  //     // If no records found, try to insert sample records
  //     if (_records.isEmpty) {
  //       print("No records found. Attempting to insert sample records.");
  //     }
  //     _errorMessage = null;
  //     print('Fetched successfully: ${_records.length} records');
  //   } catch (e) {
  //     print('Error fetching local records: ${e.toString()}');
  //     _errorMessage = 'Failed to fetch local data: ${e.toString()}';
  //     _records = []; // Ensure records is an empty list on error
  //   } finally {
  //     print("Printing Done");
  //     _isLoadingRecords = false;
  //     notifyListeners();
  //   }
  // }

  // Save bundles to SharedPreferences before logout (preserve counts)
  Future<void> saveBundlesBeforeLogout() async {
    try {
      print('Saving current bundles state before logout...');

      // Get current bundles with their counts from local database
      final currentBundles = await _databaseHelper.getActiveLocalBundles();

      if (currentBundles.isNotEmpty) {
        // Save to SharedPreferences for current user
        await _saveBundlesToPrefs(currentBundles);
        print(
            'Saved ${currentBundles.length} bundles with counts to SharedPreferences before logout');
      } else {
        print('No bundles to save before logout');
      }
    } catch (e) {
      print('Error saving bundles before logout: $e');
    }
  }

// Save both bundles and records to SharedPreferences before logout
  Future<void> saveDataBeforeLogout() async {
    try {
      print('Saving all user data before logout...');

      // Save bundles (existing logic)
      await saveBundlesBeforeLogout();

      // Save records (new logic)
      await saveRecordsBeforeLogout();

      print('All user data saved before logout');
    } catch (e) {
      print('Error saving data before logout: $e');
    }
  }

// Update clearRuntimeUserData to have option to preserve records in SharedPrefs
  Future<void> clearRuntimeUserData(
      {bool preserveRecordsInPrefs = true}) async {
    try {
      print('Clearing runtime user data...');

      // Clear bundles from local database
      await deleteAllLocalBundles();

      // Clear records from local database
      await deleteAllLocalRecords();

      // Clear temporary sync records
      await emptyTempTable();

      // Optionally clear old records from SharedPreferences if not preserving
      if (!preserveRecordsInPrefs) {
        await clearOldRecordsFromPrefs();
      }

      // Reset state variables
      _serverBundles.clear();
      _records.clear();
      _errorMessage = null;

      notifyListeners();
      print('Runtime user data cleared successfully.');
    } catch (e) {
      print('Error clearing runtime user data: $e');
    }
  }

// Clear all user-specific data when logging out or switching users
// Clear all user-specific data when switching users (not logout)
  Future<void> clearUserData({bool preserveSharedPrefs = false}) async {
    try {
      print('Clearing all user-specific data...');

      // Get current user email before clearing
      final userEmail = await _getCurrentUserEmail();

      // Clear bundles from local database
      await deleteAllLocalBundles();

      // Clear records from local database
      await deleteAllLocalRecords();

      // Clear temporary sync records
      await emptyTempTable();

      // Clear SharedPreferences only if not preserving them
      if (!preserveSharedPrefs && userEmail != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('activeBundles_$userEmail');
        print('Cleared SharedPreferences for user: $userEmail');
      } else if (preserveSharedPrefs) {
        print('Preserved SharedPreferences for user: $userEmail');
      }

      // Reset state variables
      _serverBundles.clear();
      _records.clear();
      _errorMessage = null;

      notifyListeners();
      print('User-specific data cleared successfully.');
    } catch (e) {
      print('Error clearing user data: $e');
    }
  }

  // Save records to SharedPreferences before logout
  Future<void> saveRecordsBeforeLogout() async {
    try {
      print('Saving current records state before logout...');

      // Get current records from local database
      final currentRecords = await _databaseHelper.getAllRawRecords();

      if (currentRecords.isNotEmpty) {
        final userEmail = await _getCurrentUserEmail();
        if (userEmail != null) {
          final prefs = await SharedPreferences.getInstance();

          // Convert records to JSON string
          final recordsJson = json.encode(currentRecords.map((record) {
            // Extract the data from the database format
            return json.decode(record['data'] as String);
          }).toList());

          // Save to SharedPreferences with user-specific key
          await prefs.setString('rawRecords_$userEmail', recordsJson);

          // Also save a timestamp to track when records were saved
          await prefs.setString(
              'recordsSavedAt_$userEmail', DateTime.now().toIso8601String());

          print(
              'Saved ${currentRecords.length} records to SharedPreferences before logout');

          // Log the approximate size for monitoring
          final sizeInBytes = recordsJson.length;
          final sizeInKB = (sizeInBytes / 1024).toStringAsFixed(2);
          print('Records data size: ${sizeInKB}KB');

          // Warn if size is getting large (SharedPreferences has limits)
          if (sizeInBytes > 1024 * 1024) {
            // 1MB
            print(
                'WARNING: Records data is quite large (${sizeInKB}KB). Consider data cleanup.');
          }
        }
      } else {
        print('No records to save before logout');
      }
    } catch (e) {
      print('Error saving records before logout: $e');
      // Don't throw - logout should continue even if record saving fails
    }
  }

// Load records from SharedPreferences after login
  Future<void> loadRecordsFromPrefs() async {
    try {
      print('Loading records from SharedPreferences after login...');
      final userEmail = await _getCurrentUserEmail();

      if (userEmail == null) {
        print('No user authenticated, skipping record loading');
        return;
      }

      final prefs = await SharedPreferences.getInstance();
      final recordsJson = prefs.getString('rawRecords_$userEmail');
      final savedAtString = prefs.getString('recordsSavedAt_$userEmail');

      if (recordsJson != null) {
        // Check if we already have records locally
        final localRecordCount = await getLocalRecordCount();

        if (localRecordCount == 0) {
          // No local records, restore from SharedPreferences
          final savedRecords = (json.decode(recordsJson) as List)
              .map((item) => item as Map<String, dynamic>)
              .toList();

          await _databaseHelper.insertRawRecords(savedRecords);

          print(
              'Restored ${savedRecords.length} records from SharedPreferences to local DB');

          if (savedAtString != null) {
            final savedAt = DateTime.parse(savedAtString);
            final timeDiff = DateTime.now().difference(savedAt);
            print('Records were saved ${timeDiff.inMinutes} minutes ago');
          }
        } else {
          print(
              'Local records already exist (${localRecordCount}), skipping restore from SharedPreferences');
        }
      } else {
        print('No records found in SharedPreferences for user: $userEmail');
      }
    } catch (e) {
      print('Error loading records from SharedPreferences: $e');
      // Don't throw - app should continue even if record loading fails
    }
  }

// Clear old records from SharedPreferences (cleanup method)
  Future<void> clearOldRecordsFromPrefs() async {
    try {
      final userEmail = await _getCurrentUserEmail();
      if (userEmail != null) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.remove('rawRecords_$userEmail');
        await prefs.remove('recordsSavedAt_$userEmail');
        print(
            'Cleared old records from SharedPreferences for user: $userEmail');
      }
    } catch (e) {
      print('Error clearing old records from SharedPreferences: $e');
    }
  }

  // Load user-specific data after login
// Load user-specific data after login
  Future<void> loadUserData() async {
    try {
      print('Loading user-specific data...');

      // Load bundles first
      await loadBundlesFromPrefs();

      // Load records
      await loadRecordsFromPrefs();

      print('User-specific data loaded successfully.');
    } catch (e) {
      print('Error loading user data: $e');
    }
  }

  // Optional: Add this method to manage SharedPreferences size
  Future<void> cleanupOldUserData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final keys = prefs.getKeys();

      // Find old user data (older than 7 days)
      final cutoffDate = DateTime.now().subtract(const Duration(days: 7));

      for (String key in keys) {
        if (key.startsWith('recordsSavedAt_')) {
          final savedAtString = prefs.getString(key);
          if (savedAtString != null) {
            final savedAt = DateTime.parse(savedAtString);
            if (savedAt.isBefore(cutoffDate)) {
              final userEmail = key.replaceFirst('recordsSavedAt_', '');
              await prefs.remove('rawRecords_$userEmail');
              await prefs.remove('recordsSavedAt_$userEmail');
              await prefs.remove('activeBundles_$userEmail');
              print('Cleaned up old data for user: $userEmail');
            }
          }
        }
      }
    } catch (e) {
      print('Error during cleanup: $e');
    }
  }
}
