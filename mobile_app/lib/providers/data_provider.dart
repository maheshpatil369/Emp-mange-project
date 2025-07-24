// lib/providers/data_provider.dart
import 'package:flutter/material.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../helpers/database_helper.dart';
import '../api/api_service.dart';

class DataProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  final DatabaseHelper _dbHelper = DatabaseHelper.instance;

  List<Map<String, dynamic>> _records = [];
  bool _isLoading = false;
  String _message = '';

  List<Map<String, dynamic>> get records => _records;
  bool get isLoading => _isLoading;
  String get message => _message;
  int get totalRecords => _records.length;
  int get editedRecordsCount => _records.where((r) => r['status'] == 'edited').length;

  DataProvider() {
    fetchLocalData();
  }

  void _setMessage(String msg) {
    _message = msg;
    notifyListeners();
  }
  
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  Future<void> fetchLocalData() async {
    _setLoading(true);
    _records = await _dbHelper.getLocalRecords();
    _setLoading(false);
  }

  Future<void> downloadDataFromServer() async {
    var connectivityResult = await (Connectivity().checkConnectivity());
    if (connectivityResult == ConnectivityResult.none) {
      _setMessage("No internet connection.");
      return;
    }
    
    _setLoading(true);
    _setMessage('Downloading data...');
    try {
      await _dbHelper.clearRecords();
      _records.clear();
      
      final dataList = await _apiService.downloadAssignedFile();
      
      for (var record in dataList) {
        await _dbHelper.insertRecord({
          'intimation_no': record['Intimation No'],
          'farmer_name': record['Farmer Name'],
          'crop_name': record['Crop Name'],
          'taluka': record['Taluka'],
          'insured_area': record['Insured Area'],
          'status': 'synced', // initial status
          'affected_area': record['Affrected Area'] ?? 0.0,
          'loss_percentage': record['Loss Percetage'] ?? 0,
        });
      }
      await fetchLocalData();
      _setMessage("Data downloaded successfully!");
    } catch (e) {
      _setMessage("Error: ${e.toString()}");
    } finally {
      _setLoading(false);
    }
  }

  Future<void> updateRecordOffline(Map<String, dynamic> record) async {
    final updatedRecord = Map<String, dynamic>.from(record);
    updatedRecord['status'] = 'edited';
    await _dbHelper.updateRecord(updatedRecord);
    await fetchLocalData();
  }

  Future<void> syncDataToServer() async {
    var connectivityResult = await (Connectivity().checkConnectivity());
    if (connectivityResult == ConnectivityResult.none) {
      _setMessage("No internet connection.");
      return;
    }
    
    final unsyncedRecords = await _dbHelper.getUnsyncedRecords();
    if (unsyncedRecords.isEmpty) {
      _setMessage("Everything is already synced!");
      return;
    }

    _setLoading(true);
    _setMessage('Syncing ${unsyncedRecords.length} records...');
    try {
      final syncPayload = { "records": unsyncedRecords };
      bool success = await _apiService.syncProcessedRecords(syncPayload);

      if (success) {
        for (var record in unsyncedRecords) {
          await _dbHelper.updateRecord({...record, 'status': 'synced'});
        }
        _setMessage("${unsyncedRecords.length} records synced successfully!");
        await fetchLocalData();
      } else {
         _setMessage("Server sync failed. Please try again.");
      }
    } catch (e) {
      _setMessage("Error syncing: ${e.toString()}");
    } finally {
      _setLoading(false);
    }
  }

  // Logout hone par data saaf karne ke liye
  Future<void> clearAllLocalData() async {
    await _dbHelper.clearRecords();
    _records = [];
    notifyListeners();
  }
}