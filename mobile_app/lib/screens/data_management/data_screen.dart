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
  // List<Map<String, dynamic>> _localBundles = [];
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dataProvider = Provider.of<DataProvider>(context, listen: false);
      // dataProvider.fetchLocalData();
      dataProvider.fetchServerBundles();
      // _fetchLocalBundles();
    });
    _searchController.addListener(_onSearchChanged);
  }

  // Method to fetch and print active bundles
  // Future<void> _fetchLocalBundles() async {
  //   final dataProvider = Provider.of<DataProvider>(context, listen: false);
  //   try {
  //     final bundles = await dataProvider.getLocalBundles();

  //     // Print bundle details for debugging
  //     print('Active Bundles:');
  //     for (var bundle in bundles) {
  //       print('Bundle Details:');
  //       bundle.forEach((key, value) {
  //         print('$key: $value');
  //       });
  //     }

  //     setState(() {
  //       _localBundles = bundles;
  //     });
  //   } catch (e) {
  //     print('Error fetching active bundles: $e');
  //   }
  // }

  @override
  void _onSearchChanged() async {
    final query = _searchController.text.trim();

    if (query.isEmpty) {
      setState(() {
        _searchResults = [];
        _isSearching = false;
      });
      return;
    }

    setState(() {
      _isSearching = true;
    });

    try {
      final dataProvider = Provider.of<DataProvider>(context, listen: false);
      final results = await dataProvider.searchLocalRecords(query);

      setState(() {
        _searchResults = results;
        _isSearching = false;
      });
    } catch (e) {
      print('Error searching: $e');
      setState(() {
        _isSearching = false;
      });
    }
  }

  void _refreshData() {
    final dataProvider = Provider.of<DataProvider>(context, listen: false);
    // dataProvider.fetchLocalData();
    // _fetchLocalBundles();
    dataProvider.fetchServerBundles();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<DataProvider>(
        builder: (context, dataProvider, child) {
          // Combine records and bundles display
          return Column(
            children: [
              // Search Bar
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search in local records...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchResults = [];
                                _isSearching = false;
                              });
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                    ),
                    filled: true,
                    fillColor: Colors.grey[100],
                  ),
                ),
              ),

              // Search Results
              if (_searchResults.isNotEmpty || _isSearching)
                Container(
                  height: 200,
                  margin: const EdgeInsets.symmetric(horizontal: 16.0),
                  decoration: BoxDecoration(
                    border: Border.all(color: Colors.grey[300]!),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: _isSearching
                      ? const Center(child: CircularProgressIndicator())
                      : _buildSearchResults(),
                ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12.0),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    ElevatedButton.icon(
                      icon: const Icon(Icons.download),
                      label: const Text('Sync to Device'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () async {
                        final provider =
                            Provider.of<DataProvider>(context, listen: false);
                        await provider.downloadAndStoreAssignedRecords();
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                              content: Text(
                                  'Records downloaded and stored locally!')),
                        );
                      },
                    ),
                    const SizedBox(width: 12), // spacing between buttons
                    ElevatedButton.icon(
                      icon: const Icon(Icons.sync),
                      label: const Text('Sync to Server'),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        foregroundColor: Colors.white,
                      ),
                      onPressed: () {
                        // Call your function here
                        print("Sync button pressed!");
                        // Or: await provider.syncStatus();
                      },
                    ),
                  ],
                ),
              ),
              // Server Bundles Section
              const Text(
                'Assigned Bundles',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              Expanded(
                child: _buildServerBundlesList(dataProvider),
              ),
              FutureBuilder<int>(
                future: Provider.of<DataProvider>(context, listen: false)
                    .getLocalRecordCount(),
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Padding(
                      padding: EdgeInsets.symmetric(vertical: 8.0),
                      child: Text('Loading record count...'),
                    );
                  }
                  final count = snapshot.data ?? 0;
                  return Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8.0),
                    child: Text(
                      '$count records on device',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  );
                },
              ),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 12.0),
                child: ElevatedButton.icon(
                  icon: const Icon(Icons.delete),
                  label: const Text('Delete All Local Records'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.red,
                    foregroundColor: Colors.white,
                  ),
                  onPressed: () async {
                    final provider =
                        Provider.of<DataProvider>(context, listen: false);
                    await provider.deleteAllLocalRecords();
                    setState(() {});
                  },
                ),
              ),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _refreshData,
        backgroundColor: Colors.blue,
        child: const Icon(Icons.refresh),
      ),
    );
  }

  Widget _buildSearchResults() {
    if (_searchResults.isEmpty) {
      return const Center(
        child: Text('No records found matching your search.'),
      );
    }

    return ListView.builder(
      itemCount: _searchResults.length,
      itemBuilder: (context, index) {
        final record = _searchResults[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: ListTile(
            title: Text(
              record['Farmer Name'] ?? 'Unknown',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Crop: ${record['Crop Name'] ?? 'N/A'}'),
                Text('Taluka: ${record['Taluka'] ?? 'N/A'}'),
                Text('Intimation No: ${record['Intimation No'] ?? 'N/A'}'),
                Text('Loss %: ${record['Loss Percetage'] ?? 'N/A'}%'),
              ],
            ),
            isThreeLine: true,
          ),
        );
      },
    );
  }

  Widget _buildServerBundlesList(DataProvider dataProvider) {
    final bundles = dataProvider.serverBundles;
    if (bundles.isEmpty) {
      return const Center(child: Text('No active bundles found on server.'));
    }
    return ListView.builder(
      itemCount: bundles.length,
      itemBuilder: (context, index) {
        final bundle = bundles[index];
        return Card(
          margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          child: ListTile(
            title: Text('Bundle #${bundle['bundleNo']}'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Taluka: ${bundle['taluka']}'),
                Text('Count: ${bundle['count']}'),
              ],
            ),
          ),
        );
      },
    );
  }

  // Widget _buildBundlesList() {
  //   if (_activeBundles.isEmpty) {
  //     return const Center(child: Text('No active bundles found.'));
  //   }
  //   return ListView.builder(
  //     itemCount: _activeBundles.length,
  //     itemBuilder: (context, index) {
  //       final bundle = _activeBundles[index];
  //       return Card(
  //         margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
  //         child: ListTile(
  //           title: Text('Bundle #${bundle['bundleNo']}'),
  //           subtitle: Column(
  //             crossAxisAlignment: CrossAxisAlignment.start,
  //             children: [
  //               Text('Taluka: ${bundle['taluka']}'),
  //               Text('Assigned At: ${bundle['assignedAt']}'),
  //               Text('Status: ${bundle['status']}'),
  //             ],
  //           ),
  //         ),
  //       );
  //     },
  //   );
  // }
}
