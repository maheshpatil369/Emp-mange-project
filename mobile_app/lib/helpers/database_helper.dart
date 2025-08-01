import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/member_model.dart';
import 'dart:convert';

// Custom exception for database-related errors
class DatabaseOperationException implements Exception {
  final String message;

  DatabaseOperationException(this.message);

  @override
  String toString() => 'DatabaseOperationException: $message';
}

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  static Database? _database;

  // Increment database version to trigger onCreate
  static const int _databaseVersion = 2;

  // Get the full path of the database
  Future<String> getDatabasePath() async {
    final path = join(await getDatabasesPath(), 'emp_management.db');
    print('Full Database Path: $path');
    return path;
  }

  // Modify database getter to log path
  Future<Database> get database async {
    try {
      if (_database != null) return _database!;

      // Log the database path before opening
      final databasePath = await getDatabasePath();
      print('Attempting to open database at: $databasePath');

      // Platform-specific database initialization
      if (kIsWeb) {
        // Web platform
        sqfliteFfiInit();
        _database = await databaseFactoryFfi.openDatabase(
          join(await getDatabasesPath(), 'emp_management.db'),
          options: OpenDatabaseOptions(
            version: _databaseVersion,
            onCreate: _onCreate,
            onUpgrade: _onUpgrade,
          ),
        );
      } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
        // Desktop platforms
        sqfliteFfiInit();
        _database = await databaseFactoryFfi.openDatabase(
          join(await getDatabasesPath(), 'emp_management.db'),
          options: OpenDatabaseOptions(
            version: _databaseVersion,
            onCreate: _onCreate,
            onUpgrade: _onUpgrade,
          ),
        );
      } else if (Platform.isAndroid) {
        // Explicit Android handling
        String path = join(await getDatabasesPath(), 'emp_management.db');
        _database = await openDatabase(
          path,
          version: _databaseVersion,
          onCreate: _onCreate,
          onUpgrade: _onUpgrade,
          // Add additional options for Android
          singleInstance: true,
        );
      } else if (Platform.isIOS) {
        // iOS-specific handling
        String path = join(await getDatabasesPath(), 'emp_management.db');
        _database = await openDatabase(
          path,
          version: _databaseVersion,
          onCreate: _onCreate,
          onUpgrade: _onUpgrade,
        );
      } else {
        throw UnsupportedError(
            'Platform not supported for database initialization');
      }

      return _database!;
    } catch (e) {
      print('Database initialization error: $e');
      throw Exception('Failed to initialize database');
    }
  }

  // Handle database upgrades
  Future<void> _onUpgrade(Database db, int oldVersion, int newVersion) async {
    print('Upgrading database from $oldVersion to $newVersion');

    // Add migration steps if needed
    if (oldVersion < 2) {
      // Create bundles table if it doesn't exist
      await db.execute('''
        CREATE TABLE IF NOT EXISTS bundles(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bundleNo INTEGER,
          taluka TEXT,
          assignedAt TEXT,
          status TEXT DEFAULT 'active'
        )
      ''');
      print('Bundles table created during upgrade');
    }
  }

  // Table creation logic
  Future<void> _onCreate(Database db, int version) async {
    try {
      // Members table
      await db.execute('''
          CREATE TABLE members(
            id TEXT PRIMARY KEY,
            name TEXT,
            taluka TEXT
          )
        ''');
      print('Members table created successfully');

      // Bundles table
      await db.execute('''
        CREATE TABLE bundles(
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          bundleNo INTEGER,
          taluka TEXT,
          assignedAt TEXT,
          status TEXT DEFAULT 'active'
        )
      ''');
      print('Bundles table created successfully');
    } catch (e) {
      print('Error creating tables: $e');
      rethrow;
    }
  }

  // Saare records local database se fetch karne ke liye (for DataScreen)
  Future<List<Member>> getLocalRecords() async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> maps = await db.query('members');

      // Query results (maps) ko List<Member> objects mein convert karein
      return List.generate(maps.length, (i) {
        return Member.fromMap(maps[i]);
      });
    } catch (e) {
      print('Error fetching records: $e');
      rethrow;
    }
  }

  // Insert a new bundle
  // Future<int> insertBundle(Map<String, dynamic> bundleData) async {
  //   try {
  //     print("Attempting to insert bundle: $bundleData");
  //     final db = await database;

  //     // Verify database is open
  //     if (!db.isOpen) {
  //       throw DatabaseOperationException('Database is not open');
  //     }

  //     // Check if bundles table exists
  //     final tableExists = await db.rawQuery(
  //         "SELECT name FROM sqlite_master WHERE type='table' AND name='bundles'");

  //     if (tableExists.isEmpty) {
  //       // Attempt to create table if it doesn't exist
  //       await db.execute('''
  //         CREATE TABLE IF NOT EXISTS bundles(
  //           id INTEGER PRIMARY KEY AUTOINCREMENT,
  //           bundleNo INTEGER,
  //           taluka TEXT,
  //           assignedAt TEXT,
  //           status TEXT DEFAULT 'active'
  //         )
  //       ''');
  //       print('Bundles table created on-the-fly');
  //     }

  //     // Prepare bundle data
  //     final bundleToInsert = {
  //       'bundleNo': bundleData['bundleNo'],
  //       'taluka': bundleData['taluka'],
  //       'assignedAt': DateTime.now().toIso8601String(),
  //       'status': bundleData['status'] ?? 'active'
  //     };

  //     // Validate required fields
  //     if (bundleToInsert['bundleNo'] == null ||
  //         bundleToInsert['taluka'] == null) {
  //       throw DatabaseOperationException(
  //           'Bundle number and taluka are required');
  //     }

  //     final insertResult = await db.insert(
  //       'bundles',
  //       bundleToInsert,
  //       conflictAlgorithm: ConflictAlgorithm.replace,
  //     );

  //     print("Bundle inserted successfully. Row ID: $insertResult");
  //     return insertResult;
  //   } catch (e, stackTrace) {
  //     print('Error inserting bundle: $e');
  //     print('Stacktrace: $stackTrace');

  //     // Additional diagnostic information
  //     try {
  //       final db = await database;
  //       final tables = await db
  //           .rawQuery("SELECT name FROM sqlite_master WHERE type='table'");
  //       print('Existing tables: $tables');
  //     } catch (diagnosisError) {
  //       print('Additional diagnosis failed: $diagnosisError');
  //     }

  //     rethrow;
  //   }
  // }

  Future<void> insertRawRecords(List<Map<String, dynamic>> records) async {
    final db = await database;
    // Create table if not exists
    await db.execute('''
      CREATE TABLE IF NOT EXISTS raw_records (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data TEXT
      )
    ''');
    // Insert each record as a JSON string
    for (final record in records) {
      await db.insert(
        'raw_records',
        {'data': json.encode(record)},
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    print('Inserted ${records.length} raw records into local database.');
  }

  // Fetch all active bundles
  // Future<List<Map<String, dynamic>>> getActiveLocalBundles() async {
  //   try {
  //     final db = await database;
  //     final List<Map<String, dynamic>> bundles =
  //         await db.query('bundles', where: 'status = ?', whereArgs: ['active']);

  //     print("Fetched ${bundles.length} active bundles");
  //     return bundles;
  //   } catch (e) {
  //     print('Error fetching active bundles: $e');
  //     rethrow;
  //   }
  // }

  // Update bundle status
  Future<int> updateBundleStatus(int bundleNo, String status) async {
    try {
      final db = await database;
      final updateResult = await db.update('bundles', {'status': status},
          where: 'bundleNo = ?', whereArgs: [bundleNo]);

      print("Updated bundle $bundleNo with status $status");
      return updateResult;
    } catch (e) {
      print('Error updating bundle status: $e');
      rethrow;
    }
  }

  // Search through raw records
  Future<List<Map<String, dynamic>>> searchRawRecords(String query) async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> results = await db.rawQuery('''
        SELECT data FROM raw_records 
        WHERE data LIKE ?
      ''', ['%$query%']);

      // Parse JSON data back to Map
      return results.map((row) {
        final jsonData = row['data'] as String;
        return json.decode(jsonData) as Map<String, dynamic>;
      }).toList();
    } catch (e) {
      print('Error searching raw records: $e');
      return [];
    }
  }
}
