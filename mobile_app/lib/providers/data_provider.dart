import 'package:flutter/material.dart';
import '../models/member_model.dart'; // ✅ Sahi model ko import karein
import '../api/api_service.dart';

class DataProvider with ChangeNotifier {
  final ApiService _apiService = ApiService();
  List<Member> _members = [];
  bool _isLoading = false;

  List<Member> get members => _members;
  bool get isLoading => _isLoading;

  Future<void> fetchData(String token) async {
    _isLoading = true;
    notifyListeners();

    try {
      await Future.delayed(const Duration(seconds: 1)); // Network call simulate
      // ✅ Ab yeh code sahi se kaam karega
      _members = [
        Member(name: 'Mahesh Patil', taluka: 'Panvel'),
        Member(name: 'Suresh Jadhav', taluka: 'Karjat'),
      ];
    } catch (error) {
      print(error);
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}