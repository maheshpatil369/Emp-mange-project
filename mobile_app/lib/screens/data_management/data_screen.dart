// lib/screens/data_management/data_screen.dart
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../providers/data_provider.dart';
import '../../models/member_model.dart';
import '../../services/connectivity_service.dart';

class DataScreen extends StatefulWidget {
  const DataScreen({super.key});

  @override
  State<DataScreen> createState() => _DataScreenState();
}

class _DataScreenState extends State<DataScreen> {
  final TextEditingController _searchController = TextEditingController();
  final List<Member> _filteredRecords = [];
  // List<Map<String, dynamic>> _localBundles = [];
  List<Map<String, dynamic>> _searchResults = [];
  bool _isSearching = false;
  Map<String, dynamic>? _selectedRecord;
  bool _isUniqueIdGenerated = false;
  bool _isLoadingRecords = false;
  List<Map<String, dynamic>> _tempRecords = [];
  bool _showTempRecords = false;
  bool _isSyncCooldown = false; // Add cooldown state for sync button
  int _syncCooldownSeconds = 0; // Track remaining cooldown seconds
  Timer? _syncCooldownTimer; // Timer for sync cooldown
  Set<String> _savedRecordIds = {}; // Track saved records in this session

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final dataProvider = Provider.of<DataProvider>(context, listen: false);
      dataProvider.fetchAndSyncBundles();
      // Remove duplicate call - fetchServerBundles() already calls fetchAndSyncBundles()
      _loadTempRecords();
    });
    _searchController.addListener(_onSearchChanged);
  }

  Future<void> _loadTempRecords() async {
    try {
      final dataProvider = Provider.of<DataProvider>(context, listen: false);
      final records = await dataProvider.getRecordsToSync();
      setState(() {
        _tempRecords = records;
      });
    } catch (e) {
      print('Error loading temp records: $e');
    }
  }

  // Start the sync cooldown timer
  void _startSyncCooldown() {
    setState(() {
      _isSyncCooldown = true;
      _syncCooldownSeconds = 10; // 10 seconds cooldown
    });

    _syncCooldownTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _syncCooldownSeconds--;
      });

      if (_syncCooldownSeconds <= 0) {
        setState(() {
          _isSyncCooldown = false;
          _syncCooldownSeconds = 0;
        });
        timer.cancel();
      }
    });
  }

  @override
  void dispose() {
    _syncCooldownTimer?.cancel();
    _searchController.dispose();
    super.dispose();
  }

  // Check if record has a unique ID (either just generated or previously existing)
  bool _hasUniqueId(Map<String, dynamic> record) {
    return record['UniqueId'] != null &&
        record['UniqueId'].toString().isNotEmpty;
  }

  //Method to check if records are already downloaded
  bool get _alreadyDownloaded {
    final dataProvider = Provider.of<DataProvider>(context, listen: false);
    return false;
  }

  bool _isNotInTempRecords(Map<String, dynamic> record) {
    return _tempRecords.every((tempRecord) =>
        tempRecord['UniqueId'] != record['UniqueId'] &&
        tempRecord['Search from'] != record['Search from']);
  }

  // Check if record has already been saved in this session
  bool _isRecordAlreadySaved(Map<String, dynamic>? record) {
    if (record == null) return false;
    final uniqueId = record['UniqueId']?.toString();
    if (uniqueId == null) return false;
    return _savedRecordIds.contains(uniqueId);
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
    dataProvider.fetchAndSyncBundles(); // Replaced with new method
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Main content
          Consumer<DataProvider>(
            builder: (context, dataProvider, child) {
              return Column(
                children: [
                  // Search Bar with Temp Records Button
                  Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Row(
                      children: [
                        // Temp Records Button
                        Container(
                          decoration: BoxDecoration(
                            color: _tempRecords.isNotEmpty
                                ? Colors.orange
                                : Colors.grey,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: IconButton(
                            icon: Badge(
                              label: Text('${_tempRecords.length}'),
                              isLabelVisible: _tempRecords.isNotEmpty,
                              child:
                                  const Icon(Icons.list, color: Colors.white),
                            ),
                            onPressed: () {
                              setState(() {
                                _showTempRecords = !_showTempRecords;
                              });
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        // Search Field
                        Expanded(
                          child: TextField(
                            controller: _searchController,
                            inputFormatters: [
                              FilteringTextInputFormatter.digitsOnly,
                            ],
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              hintText:
                                  'Search by "Search from" ID (partial match)...',
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
                      ],
                    ),
                  ),

                  // Temp Records List
                  if (_showTempRecords && _tempRecords.isNotEmpty)
                    Container(
                      height: 200,
                      margin: const EdgeInsets.symmetric(horizontal: 16.0),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.orange[300]!),
                        borderRadius: BorderRadius.circular(8),
                        color: Colors.orange[50],
                      ),
                      child: Column(
                        children: [
                          Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Row(
                              children: [
                                const Icon(Icons.list, color: Colors.orange),
                                const SizedBox(width: 8),
                                Text(
                                  'Temporary Records (${_tempRecords.length})',
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: Colors.orange,
                                  ),
                                ),
                                const Spacer(),
                                IconButton(
                                  icon: const Icon(Icons.close, size: 20),
                                  onPressed: () {
                                    setState(() {
                                      _showTempRecords = false;
                                    });
                                  },
                                ),
                              ],
                            ),
                          ),
                          Expanded(
                            child: ListView.builder(
                              itemCount: _tempRecords.length,
                              itemBuilder: (context, index) {
                                final record = _tempRecords[index];
                                return ListTile(
                                  dense: true,
                                  title: Text(
                                    record['Farmer Name'] ?? 'Unknown',
                                    style: const TextStyle(fontSize: 12),
                                  ),
                                  subtitle: Text(
                                    'ID: ${record['UniqueId'] ?? 'N/A'}',
                                    style: const TextStyle(fontSize: 10),
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
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
                    child: SingleChildScrollView(
                      scrollDirection: Axis.horizontal,
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
                            onPressed: _isLoadingRecords
                                ? null
                                : () async {
                                    setState(() {
                                      _isLoadingRecords = true;
                                    });
                                    final provider = Provider.of<DataProvider>(
                                        context,
                                        listen: false);
                                    final result = await provider
                                        .downloadAndStoreAssignedRecords();
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      SnackBar(content: Text(result)),
                                    );
                                    setState(() {
                                      _isLoadingRecords = false;
                                    });
                                  },
                          ),
                          const SizedBox(width: 12), // spacing between buttons
                          // ElevatedButton.icon(
                          //   icon: const Icon(Icons.delete_sweep),
                          //   label: const Text('Empty Temp'),
                          //   style: ElevatedButton.styleFrom(
                          //     backgroundColor: Colors.orange,
                          //     foregroundColor: Colors.white,
                          //   ),
                          //   onPressed: () async {
                          //     // Show confirmation popup
                          //     bool? confirmed = await showDialog<bool>(
                          //       context: context,
                          //       builder: (context) {
                          //         return AlertDialog(
                          //           title: const Text('Are you sure?'),
                          //           content: const Text(
                          //               'Do you want to empty the temporary table?'),
                          //           actions: [
                          //             TextButton(
                          //               onPressed: () =>
                          //                   Navigator.pop(context, false), // No
                          //               child: const Text('No'),
                          //             ),
                          //             ElevatedButton(
                          //               onPressed: () =>
                          //                   Navigator.pop(context, true), // Yes
                          //               style: ElevatedButton.styleFrom(
                          //                   backgroundColor: Colors.red),
                          //               child: const Text('Yes'),
                          //             ),
                          //           ],
                          //         );
                          //       },
                          //     );

                          //     // If user confirms
                          //     if (confirmed == true) {
                          //       print('User confirmed! Running next logic...');
                          //       if (_tempRecords.isNotEmpty) {
                          //         try {
                          //           final provider = Provider.of<DataProvider>(
                          //               context,
                          //               listen: false);
                          //           final success =
                          //               await provider.deleteAllLocalBundles();
                          //           if (success) {
                          //             setState(() {
                          //               _tempRecords = [];
                          //               _showTempRecords = false;
                          //             });
                          //             ScaffoldMessenger.of(context)
                          //                 .showSnackBar(
                          //               const SnackBar(
                          //                 content: Text(
                          //                     'Temporary table emptied successfully!'),
                          //                 backgroundColor: Colors.orange,
                          //               ),
                          //             );
                          //           } else {
                          //             ScaffoldMessenger.of(context)
                          //                 .showSnackBar(
                          //               const SnackBar(
                          //                 content: Text(
                          //                     'Failed to empty temporary table.'),
                          //                 backgroundColor: Colors.red,
                          //               ),
                          //             );
                          //           }
                          //         } catch (e) {
                          //           ScaffoldMessenger.of(context).showSnackBar(
                          //             SnackBar(
                          //               content: Text(
                          //                   'Error emptying temp table: $e'),
                          //               backgroundColor: Colors.red,
                          //             ),
                          //           );
                          //         }
                          //       } else {
                          //         ScaffoldMessenger.of(context).showSnackBar(
                          //           const SnackBar(
                          //             content: Text(
                          //                 'No temporary records to delete.'),
                          //             backgroundColor: Colors.blue,
                          //           ),
                          //         );
                          //       }
                          //     } else {
                          //       print('User cancelled the action.');
                          //     }
                          //   },
                          // ),
                          const SizedBox(width: 12), // spacing between buttons
                          ElevatedButton.icon(
                            icon: _isSyncCooldown
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                          Colors.white),
                                    ),
                                  )
                                : const Icon(Icons.sync),
                            label: Text(_isSyncCooldown
                                ? 'Wait ${_syncCooldownSeconds}s'
                                : 'Sync to Server'),
                            style: ElevatedButton.styleFrom(
                              backgroundColor:
                                  _isSyncCooldown ? Colors.grey : Colors.green,
                              foregroundColor: Colors.white,
                            ),
                            onPressed: (_tempRecords.isNotEmpty &&
                                    !_isSyncCooldown)
                                ? () async {
                                    try {
                                      final provider =
                                          Provider.of<DataProvider>(context,
                                              listen: false);

                                      // Check for completed bundles
                                      List<String> completedTalukas = [];
                                      for (var bundle
                                          in provider.serverBundles) {
                                        final taluka = bundle['taluka'];
                                        final currentCount =
                                            bundle['count'] ?? 0;

                                        if (currentCount >= 250) {
                                          completedTalukas.add(taluka);
                                          // Send completion notification to server
                                          await provider
                                              .completeBundleForTaluka(taluka);
                                        }
                                      }

                                      // Show completion dialog if any bundles are completed
                                      if (completedTalukas.isNotEmpty) {
                                        await showDialog(
                                          context: context,
                                          builder: (context) => AlertDialog(
                                            title: const Text(
                                                'Bundle Limit Reached'),
                                            content: Text(
                                              'The following talukas have reached their bundle limit of 250 records:\n\n${completedTalukas.join("\n")}\n\nPlease request new bundles for these talukas.',
                                            ),
                                            actions: [
                                              TextButton(
                                                child: const Text('OK'),
                                                onPressed: () =>
                                                    Navigator.pop(context),
                                              ),
                                            ],
                                          ),
                                        );
                                      }

                                      final success =
                                          await provider.syncRecordsToServer();

                                      if (success) {
                                        final recordCount = _tempRecords.length;
                                        setState(() {
                                          _tempRecords = [];
                                          _showTempRecords = false;
                                        });

                                        // Start cooldown timer after successful sync
                                        _startSyncCooldown();

                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                            content: Text(
                                                'Successfully synced $recordCount records to server! Next sync available in 10 seconds.'),
                                            backgroundColor: Colors.green,
                                          ),
                                        );
                                      } else {
                                        ScaffoldMessenger.of(context)
                                            .showSnackBar(
                                          SnackBar(
                                            content: Text(
                                                'Failed to sync records to server. Please try again.'),
                                            backgroundColor: Colors.red,
                                          ),
                                        );
                                      }
                                    } catch (e) {
                                      ScaffoldMessenger.of(context)
                                          .showSnackBar(
                                        SnackBar(
                                          content:
                                              Text('Error syncing records: $e'),
                                          backgroundColor: Colors.red,
                                        ),
                                      );
                                    }
                                  }
                                : null,
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Server Bundles Section
                  const Text(
                    'Assigned Bundles',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                  Expanded(
                    child: Consumer<DataProvider>(
                      builder: (context, provider, child) {
                        return _buildServerBundlesList(provider);
                      },
                    ),
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
  child: Align(
    alignment: Alignment.centerLeft, // ✅ Left align the button
    child: ElevatedButton(
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.red, // 🔴 Red background
        foregroundColor: Colors.white,
        padding: const EdgeInsets.all(12), // Slight padding for icon
        shape: const CircleBorder(), // ✅ Make button circular (optional)
      ),
      onPressed: () async {
        // Show confirmation dialog
        bool? confirmed = await showDialog<bool>(
          context: context,
          builder: (context) {
            return AlertDialog(
              title: const Text('Are you sure?'),
              content: const Text(
                  'Do you really want to delete all local records? This action cannot be undone.'),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context, false), // Cancel
                  child: const Text('No'),
                ),
                ElevatedButton(
                  onPressed: () => Navigator.pop(context, true), // Confirm
                  style:
                      ElevatedButton.styleFrom(backgroundColor: Colors.red),
                  child: const Text('Yes'),
                ),
              ],
            );
          },
        );

        if (confirmed == true) {
          try {
            final provider =
                Provider.of<DataProvider>(context, listen: false);
            await provider.deleteAllLocalRecords();

            setState(() {
              _searchResults = [];
              _selectedRecord = null;
              _isUniqueIdGenerated = false;
            });

            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text('All local records deleted successfully!'),
                backgroundColor: Colors.red,
              ),
            );
          } catch (e) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Error deleting local records: $e'),
                backgroundColor: Colors.red,
              ),
            );
          }
        } else {
          print('User cancelled deleting all local records.');
        }
      },
      // ✅ Icon only (No label text)
      child: const Icon(Icons.delete, size: 24),
    ),
  ),
),
                ],
              );  
              
            },
          ),

          // Absolute positioned Record Details Section
          if (_selectedRecord != null)
            Positioned(
              bottom: 0,
              left: 0,
              right: 0,
              child: Container(
                height: 605, // Fixed height to prevent overflow
                margin: const EdgeInsets.all(16.0),
                padding: const EdgeInsets.all(16.0),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.grey[300]!),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.grey.withOpacity(0.3),
                      spreadRadius: 2,
                      blurRadius: 8,
                      offset: const Offset(0, -2),
                    ),
                  ],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        const Icon(Icons.description, color: Colors.blue),
                        const SizedBox(width: 8),
                        const Text(
                          'Record Details',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Spacer(),
                        IconButton(
                          icon: const Icon(Icons.close),
                          onPressed: () {
                            setState(() {
                              _selectedRecord = null;
                              _isUniqueIdGenerated = false;
                            });
                          },
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Information for the selected record. Generate an ID and then save.',
                      style: TextStyle(
                        fontSize: 12,
                        color: Colors.grey[600],
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Expanded(
                      child: SingleChildScrollView(
                        child: _buildRecordDetails(),
                      ),
                    ),
                    const SizedBox(height: 16),
                    _buildActionButtons(),
                  ],
                ),
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () async {
          final dataProvider =
              Provider.of<DataProvider>(context, listen: false);
          await dataProvider.refreshLocalBundles(); // Use simple local refresh
          await _loadTempRecords();
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Local data refreshed'),
              duration: Duration(seconds: 1),
            ),
          );
        },
        backgroundColor: Colors.blue,
        child: const Icon(Icons.refresh),
      ),
    );
  }

  Widget _buildSearchResults() {
    if (_searchResults.isEmpty) {
      final query = _searchController.text.trim();
      String message =
          'No records found containing "$query" in "Search from" field.';

      return Center(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Colors.grey),
          ),
        ),
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
                Text(
                    'Search ID: ${record['Search from'] ?? record['Search From'] ?? record['search from'] ?? 'N/A'}',
                    style: const TextStyle(
                        fontWeight: FontWeight.w600, color: Colors.blue)),
                Text('Crop: ${record['Crop Name'] ?? 'N/A'}'),
                Text('Taluka: ${record['Taluka'] ?? 'N/A'}'),
                Text('Intimation No: ${record['Intimation No'] ?? 'N/A'}'),
                Text('Loss %: ${record['Loss Percetage'] ?? 'N/A'}%'),
              ],
            ),
            isThreeLine: true,
            onTap: () {
              setState(() {
                _selectedRecord = record;
                // Check if record already has a unique ID
                _isUniqueIdGenerated = _hasUniqueId(record);
              });
              // Clear search results after selection
              _searchController.clear();
              _searchResults.clear();
              _isSearching = false;
            },
          ),
        );
      },
    );
  }

  Widget _buildServerBundlesList(DataProvider dataProvider) {
    if (dataProvider.isLoadingBundles) {
      return const Center(child: CircularProgressIndicator());
    }

    final bundles = dataProvider.serverBundles;

    if (bundles.isEmpty) {
      final message = isOffline
          ? 'No bundles found in local storage.'
          : 'No active bundles found on server.';
      return Center(child: Text(message));
    }

    return Column(
      children: [
        if (isOffline)
          const Padding(
            padding: EdgeInsets.all(8.0),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.wifi_off, color: Colors.orange),
                SizedBox(width: 8),
                Text(
                  'Displaying bundles from local storage (Offline)',
                  style: TextStyle(
                    fontStyle: FontStyle.italic,
                    color: Colors.orange,
                  ),
                ),
              ],
            ),
          ),
        Expanded(
          child: ListView.builder(
            itemCount: bundles.length,
            itemBuilder: (context, index) {
              final bundle = bundles[index];
              final count = bundle['count'] ?? 0; // Handle null count
              final isCompleted = count >= 250;
              return Card(
                margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                color: isCompleted ? Colors.grey[200] : Colors.white,
                child: ListTile(
                  title: Text(
                    'Bundle #${bundle['bundleNo']}',
                    style: TextStyle(
                      color: isCompleted ? Colors.grey[600] : Colors.black,
                    ),
                  ),
                  subtitle: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Taluka: ${bundle['taluka']}',
                        style: TextStyle(
                          color:
                              isCompleted ? Colors.grey[600] : Colors.black87,
                        ),
                      ),
                      Row(
                        children: [
                          Text(
                            'Count: $count',
                            style: TextStyle(
                              color: isCompleted
                                  ? Colors.grey[600]
                                  : Colors.black87,
                            ),
                          ),
                          if (isCompleted)
                            Container(
                              margin: const EdgeInsets.only(left: 8),
                              padding: const EdgeInsets.symmetric(
                                  horizontal: 6, vertical: 2),
                              decoration: BoxDecoration(
                                color: Colors.grey[400],
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: const Text(
                                'COMPLETED',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                        ],
                      ),
                      if (bundle['assignedAt'] != null)
                        Text(
                          'Assigned: ${bundle['assignedAt']}',
                          style: TextStyle(
                            color:
                                isCompleted ? Colors.grey[600] : Colors.black87,
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
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

  // Widget _buildRecordDetails() {
  //   final record = _selectedRecord!;
  //   final fields = [
  //     {'label': 'Farmer Name', 'key': 'Farmer Name'},
  //     {'label': 'Crop Name', 'key': 'Crop Name'},
  //     {'label': 'Intimation No', 'key': 'Intimation No'},
  //     {'label': 'Correction Details', 'key': 'Correction Details'},
  //     {'label': 'UniqueId', 'key': 'UniqueId'},
  //     {'label': 'PDf Required', 'key': 'PDf Required'},
  //     {'label': 'Search from', 'key': 'Search from'},
  //     {'label': 'Taluka', 'key': 'Taluka'},
  //   ];

  //   return Column(
  //     children: fields.map((field) {
  //       final isPdfRequired = field['key'] == 'PDf Required';
  //       final isSearchFrom = field['key'] == 'Search from';
  //       final isUniqueId = field['key'] == 'UniqueId';
  //       String value = record[field['key']]?.toString() ?? '';
  //       if (isPdfRequired) {
  //         if (value.toLowerCase() == 'yes') {
  //           value = 'Yes';
  //         } else {
  //           value = 'No';
  //         }
  //       }

  //       return Container(
  //         margin: const EdgeInsets.only(bottom: 8),
  //         padding: const EdgeInsets.all(12),
  //         decoration: BoxDecoration(
  //           color: isSearchFrom
  //               ? Colors.green[50]
  //               : isPdfRequired
  //                   ? Colors.lightGreen[50]
  //                   : isUniqueId
  //                       ? Colors.blue[50]
  //                       : Colors.grey[50],
  //           borderRadius: BorderRadius.circular(6),
  //           border: Border.all(
  //             color: isSearchFrom
  //                 ? Colors.green[200]!
  //                 : isPdfRequired
  //                     ? Colors.lightGreen[200]!
  //                     : isUniqueId
  //                         ? Colors.blue[200]!
  //                         : Colors.grey[200]!,
  //           ),
  //         ),
  //         child: Row(
  //           crossAxisAlignment: CrossAxisAlignment.start,
  //           children: [
  //             SizedBox(
  //               width: 120,
  //               child: Text(
  //                 '${field['label']}:',
  //                 style: const TextStyle(
  //                   fontWeight: FontWeight.w600,
  //                   fontSize: 12,
  //                 ),
  //               ),
  //             ),
  //             Expanded(
  //               child: Text(
  //                 value,
  //                 style: TextStyle(
  //                   // fontSize: 12,
  //                   fontSize: isUniqueId ? 16 : 12,
  //                   fontWeight: isUniqueId ? FontWeight.bold : FontWeight.w600,
  //                   color: isPdfRequired
  //                       ? (value == 'Yes' ? Colors.red : Colors.black87)
  //                       : isSearchFrom
  //                           ? Colors.green[700]
  //                           : isUniqueId
  //                               ? Colors.blue[700]
  //                               : Colors.black87,
  //                 ),
  //               ),
  //             ),
  //           ],
  //         ),
  //       );
  //     }).toList(),
  //   );
  // }

  Widget _buildRecordDetails() {
    final record = _selectedRecord!;
    final fields = [
      {'label': 'Farmer Name', 'key': 'Farmer Name'},
      {'label': 'Crop Name', 'key': 'Crop Name'},
      {'label': 'Intimation No', 'key': 'Intimation No'},
      {'label': 'Correction Details', 'key': 'Correction Details'},
      {'label': 'UniqueId', 'key': 'UniqueId'},
      {'label': 'PDf Required', 'key': 'PDf Required'},
      {'label': 'Search from', 'key': 'Search from'},
      {'label': 'Taluka', 'key': 'Taluka'},
    ];

    return Column(
      children: fields.map((field) {
        final isPdfRequired = field['key'] == 'PDf Required';
        final isSearchFrom = field['key'] == 'Search from';
        final isUniqueId = field['key'] == 'UniqueId';
        String value = record[field['key']]?.toString() ?? '';
        if (isPdfRequired) {
          if (value.toLowerCase() == 'yes') {
            value = 'Yes';
          } else {
            value = 'No';
          }
        }

        return Container(
          margin: const EdgeInsets.only(bottom: 8),
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            // ✅ Background color updated for PDf Required == Yes
            color: isPdfRequired
                ? (value.toLowerCase() == 'yes'
                    ? Colors.red
                    : Colors.lightGreen[50])
                : isSearchFrom
                    ? Colors.green[50]
                    : isUniqueId
                        ? Colors.blue[50]
                        : Colors.grey[50],
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              // ✅ Border color updated for PDf Required == Yes
              color: isPdfRequired
                  ? (value.toLowerCase() == 'yes'
                      ? Colors.red.shade700
                      : Colors.lightGreen[200]!)
                  : isSearchFrom
                      ? Colors.green[200]!
                      : isUniqueId
                          ? Colors.blue[200]!
                          : Colors.grey[200]!,
            ),
          ),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              SizedBox(
                width: 120,
                child: Text(
                  '${field['label']}:',
                  style: const TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
              ),
              Expanded(
                child: Text(
                  value,
                  style: TextStyle(
                    fontSize: isUniqueId ? 16 : 12,
                    fontWeight: isUniqueId ? FontWeight.bold : FontWeight.w600,
                    // ✅ Text color updated for PDf Required == Yes
                    color: isPdfRequired && value.toLowerCase() == 'yes'
                        ? Colors.white
                        : isPdfRequired
                            ? Colors.black87
                            : isSearchFrom
                                ? Colors.green[700]
                                : isUniqueId
                                    ? Colors.blue[700]
                                    : Colors.black87,
                  ),
                ),
              ),
            ],
          ),
        );
      }).toList(),
    );
  }

  Widget _buildActionButtons() {
    return Row(
      children: [
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.qr_code),
            label: const Text('Generate Unique ID'),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.blue,
              foregroundColor: Colors.white,
            ),
            onPressed: (_selectedRecord != null &&
                    !_hasUniqueId(_selectedRecord!))
                ? () async {
                    try {
                      final provider =
                          Provider.of<DataProvider>(context, listen: false);

                      // Check if bundle is available for this taluka
                      final taluka = _selectedRecord!['Taluka'];
                      final bundle = provider.serverBundles.firstWhere(
                        (b) => b['taluka'] == taluka && (b['count'] ?? 0) < 250,
                        orElse: () => {},
                      );

                      print("Bundle for $taluka: $bundle");
                      print("Selected Record: $_selectedRecord");

                      if (bundle.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'No available bundle found for this taluka. Please request a new bundle.'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      // Generate unique ID (this no longer increments the count)
                      final uniqueId =
                          await provider.generateUniqueId(_selectedRecord!);
                      print("Generated Unique ID: $uniqueId");

                      setState(() {
                        _isUniqueIdGenerated = true;
                        _selectedRecord =
                            Map<String, dynamic>.from(_selectedRecord!)
                              ..['UniqueId'] = uniqueId;
                      });

                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Unique ID generated: $uniqueId'),
                          backgroundColor: Colors.green,
                        ),
                      );
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Error generating unique ID: $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                : null,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: ElevatedButton.icon(
            icon: const Icon(Icons.save),
            label: Text(_isRecordAlreadySaved(_selectedRecord)
                ? 'Already Saved'
                : 'Save Record'),
            style: ElevatedButton.styleFrom(
              backgroundColor: _isRecordAlreadySaved(_selectedRecord)
                  ? Colors.grey
                  : Colors.green,
              foregroundColor: Colors.white,
            ),
            onPressed: (_selectedRecord != null &&
                    _hasUniqueId(_selectedRecord!) &&
                    _isNotInTempRecords(_selectedRecord!) &&
                    !_isRecordAlreadySaved(_selectedRecord))
                ? () async {
                    try {
                      final provider =
                          Provider.of<DataProvider>(context, listen: false);

                      // Check if bundle will reach limit
                      final taluka = _selectedRecord!['Taluka'];
                      final bundle = provider.serverBundles.firstWhere(
                        (b) => b['taluka'] == taluka,
                        orElse: () => {},
                      );

                      if (bundle.isEmpty) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content:
                                Text('No active bundle found for this taluka'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      final currentCount = bundle['count'] ?? 0;
                      if (currentCount >= 250) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Bundle is full (250 records). Please request a new bundle.'),
                            backgroundColor: Colors.red,
                          ),
                        );
                        return;
                      }

                      // Save record to temporary storage (with duplicate checking)
                      final success =
                          await provider.saveRecordToSync(_selectedRecord!);

                      if (success) {
                        // Add record ID to saved set to prevent duplicate saves
                        final uniqueId =
                            _selectedRecord!['UniqueId']?.toString();
                        if (uniqueId != null) {
                          _savedRecordIds.add(uniqueId);
                        }

                        // Only increment bundle count if save was successful and not a duplicate
                        await provider.incrementBundleCount(taluka);
                        await _loadTempRecords(); // Refresh temp records list

                        // Check if bundle just reached 250
                        final newCount = currentCount + 1;
                        if (newCount >= 250) {
                          await showDialog(
                            context: context,
                            builder: (context) => AlertDialog(
                              title: const Text('Bundle Full'),
                              content: Text(
                                'The bundle for $taluka has reached its limit of 250 records.\nPlease request a new bundle for this taluka.',
                              ),
                              actions: [
                                TextButton(
                                  child: const Text('OK'),
                                  onPressed: () => Navigator.pop(context),
                                ),
                              ],
                            ),
                          );
                        }

                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Record saved to temporary storage!'),
                            backgroundColor: Colors.green,
                          ),
                        );

                        // Clear the selected record after successful save
                        setState(() {
                          _selectedRecord = null;
                          _isUniqueIdGenerated = false;
                        });
                      } else {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text(
                                'Failed to save record. Record may already exist in temporary storage.'),
                            backgroundColor: Colors.orange,
                          ),
                        );
                      }
                    } catch (e) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        SnackBar(
                          content: Text('Error saving record: $e'),
                          backgroundColor: Colors.red,
                        ),
                      );
                    }
                  }
                : null,
          ),
        ),
      ],
    );
  }
}
