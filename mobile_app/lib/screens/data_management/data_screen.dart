// lib/screens/data_management/data_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/data_provider.dart';
import '../../models/member_model.dart';

class DataScreen extends StatefulWidget {
  const DataScreen({super.key});

  @override
  State<DataScreen> createState() => _DataScreenState();
}

class _DataScreenState extends State<DataScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<Member> _filteredRecords = [];

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DataProvider>(context, listen: false).fetchLocalData();
    });
    _searchController.addListener(_onSearchChanged);
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  void _onSearchChanged() {
    final dataProvider = Provider.of<DataProvider>(context, listen: false);
    final query = _searchController.text.toLowerCase();

    setState(() {
      _filteredRecords = dataProvider.records.where((member) {
        return member.id.toLowerCase().contains(query) ||
               member.name.toLowerCase().contains(query) ||
               member.taluka.toLowerCase().contains(query);
      }).toList();
    });
  }

  void _refreshData() {
    Provider.of<DataProvider>(context, listen: false).fetchLocalData();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _refreshData,
          ),
        ],
      ),
      body: Consumer<DataProvider>(
        builder: (context, dataProvider, child) {
          final displayRecords = _searchController.text.isEmpty
              ? dataProvider.records
              : _filteredRecords;

          if (dataProvider.isLoadingRecords && displayRecords.isEmpty) {
            return const Center(child: CircularProgressIndicator());
          }

          if (dataProvider.errorMessage != null) {
            return Center(
              child: Text('Error: ${dataProvider.errorMessage}'),
            );
          }

          return Column(
            children: [
              Padding(
                padding: const EdgeInsets.all(8.0),
                child: TextField(
                  controller: _searchController,
                  decoration: const InputDecoration(
                    labelText: 'Search by ID or Name',
                    border: OutlineInputBorder(),
                    prefixIcon: Icon(Icons.search),
                  ),
                ),
              ),
              Expanded(
                child: displayRecords.isEmpty
                    ? const Center(child: Text('No records found locally.'))
                    : ListView.builder(
                        itemCount: displayRecords.length,
                        itemBuilder: (context, index) {
                          final member = displayRecords[index];
                          return Card(
                            margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            child: ListTile(
                              title: Text('ID: ${member.id}'),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text('Name: ${member.name}'),
                                  Text('Taluka: ${member.taluka}'),
                                ],
                              ),
                              onTap: () {
                                // Handle tap on a record if needed
                              },
                            ),
                          );
                        },
                      ),
              ),
            ],
          );
        },
      ),
    );
  }
}
