// lib/providers/data_provider.dart
import 'package:flutter/material.dart';
import '../api/api_service.dart';
import '../helpers/database_helper.dart';
import '../models/member_model.dart';

class DataProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final DatabaseHelper _databaseHelper = DatabaseHelper();

  List<String> _districts = [];
  List<String> _talukas = [];
  bool _isLoadingConfig = false;
  bool _isAssigningBundle = false;
  String? _errorMessage;

  List<Member> _records = [];
  bool _isLoadingRecords = false;

  List<String> get districts => _districts;
  List<String> get talukas => _talukas;
  bool get isLoadingConfig => _isLoadingConfig;
  bool get isAssigningBundle => _isAssigningBundle;
  String? get errorMessage => _errorMessage;
  
  List<Member> get records => _records;
  bool get isLoadingRecords => _isLoadingRecords;

  DataProvider() {
    loadConfig();
    fetchLocalData();
  }

  Future<void> loadConfig() async {
    _isLoadingConfig = true; 
    _errorMessage = null; 
    notifyListeners();

    try {
      final config = await _apiService.fetchConfig();
      _districts = List<String>.from(config['locations'] ?? []);
      _talukas = List<String>.from(config['talukas'] ?? []);
    } catch (e) {
      _errorMessage = 'Failed to load configuration: ${e.toString()}';
      print(_errorMessage);
    } finally {
      _isLoadingConfig = false;
      notifyListeners();
    }
  }

  Future<void> assignWorkBundle(String taluka) async {
    _isAssigningBundle = true;
    _errorMessage = null;
    notifyListeners();

    try {
      await _apiService.assignBundle(taluka);
      _errorMessage = null; 
      print('Bundle assigned successfully to $taluka');
    } catch (e) {
      _errorMessage = 'Failed to assign bundle: ${e.toString()}';
      print(_errorMessage);
    } finally {
      _isAssigningBundle = false;
      notifyListeners();
    }
  }

  Future<void> fetchLocalData() async {
    _isLoadingRecords = true;
    _errorMessage = null;
    notifyListeners();

    try {
      _records = await _databaseHelper.getRecords();
    } catch (e) {
      _errorMessage = 'Failed to fetch local data: ${e.toString()}';
      print(_errorMessage);
    } finally {
      _isLoadingRecords = false;
      notifyListeners();
    }
  }
}
