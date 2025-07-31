import 'dart:io';
import 'package:flutter/foundation.dart' show kIsWeb;
import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';
import 'package:sqflite_common_ffi/sqflite_ffi.dart';
import '../models/member_model.dart';

class DatabaseHelper {
  static final DatabaseHelper _instance = DatabaseHelper._internal();
  factory DatabaseHelper() => _instance;
  DatabaseHelper._internal();

  static Database? _database;

  // Database instance ko provide karega
  Future<Database> get database async {
    try {
      if (_database != null) return _database!;

      // Platform-specific database initialization
      if (kIsWeb) {
        // Web platform
        sqfliteFfiInit();
        _database = await databaseFactoryFfi.openDatabase(
          join(await getDatabasesPath(), 'emp_management.db'),
          options: OpenDatabaseOptions(
            version: 1,
            onCreate: _onCreate,
          ),
        );
      } else if (Platform.isWindows || Platform.isLinux || Platform.isMacOS) {
        // Desktop platforms
        sqfliteFfiInit();
        _database = await databaseFactoryFfi.openDatabase(
          join(await getDatabasesPath(), 'emp_management.db'),
          options: OpenDatabaseOptions(
            version: 1,
            onCreate: _onCreate,
          ),
        );
      } else if (Platform.isAndroid) {
        // Explicit Android handling
        String path = join(await getDatabasesPath(), 'emp_management.db');
        _database = await openDatabase(
          path,
          version: 1,
          onCreate: _onCreate,
          // Add additional options for Android
          singleInstance: true,
        );
      } else if (Platform.isIOS) {
        // iOS-specific handling
        String path = join(await getDatabasesPath(), 'emp_management.db');
        _database = await openDatabase(
          path,
          version: 1,
          onCreate: _onCreate,
        );
      } else {
        throw UnsupportedError(
            'Platform not supported for database initialization');
      }

      return _database!;
    } catch (e, stackTrace) {
      print('Database initialization error: $e');
      print('Stacktrace: $stackTrace');
      throw Exception('Failed to initialize database: $e');
    }
  }

  // Table creation logic
  Future<void> _onCreate(Database db, int version) async {
    try {
      await db.execute('''
        CREATE TABLE members(
          id TEXT PRIMARY KEY,
          name TEXT,
          taluka TEXT
        )
      ''');
      print('Members table created successfully');
    } catch (e) {
      print('Error creating members table: $e');
      rethrow;
    }
  }

  // Record ko local database mein insert karein ya update karein agar exist karta hai
  Future<int> insertMember(Member member) async {
    try {
      final db = await database;
      return await db.insert(
        'members',
        member.toMap(),
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    } catch (e) {
      print('Error inserting member: $e');
      rethrow;
    }
  }

  // Saare records local database se fetch karne ke liye (for DataScreen)
  Future<List<Member>> getRecords() async {
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

  // Local database mein record search karne ke liye (Offline Search ke liye)
  Future<List<Member>> searchRecords(String query) async {
    try {
      final db = await database;
      final List<Map<String, dynamic>> maps = await db.query(
        'members',
        where: 'id LIKE ? OR name LIKE ?',
        whereArgs: ['%$query%', '%$query%'],
      );
      return List.generate(maps.length, (i) {
        return Member.fromMap(maps[i]);
      });
    } catch (e) {
      print('Error searching records: $e');
      rethrow;
    }
  }

  // Saare records clear karne ke liye (e.g., logout ya reset par)
  Future<void> clearAllRecords() async {
    try {
      final db = await database;
      await db.delete('members');
    } catch (e) {
      print('Error clearing records: $e');
      rethrow;
    }
  }
}
