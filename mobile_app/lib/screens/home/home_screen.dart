// lib/screens/home/home_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/data_provider.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? _selectedTaluka;
  String? _userDistrict; // Store user's district

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DataProvider>(context, listen: false).loadConfig();
      _loadUserDistrict(); // Load user's district
    });
  }

  // Add this method to get user's district
  void _loadUserDistrict() async {
    final dataProvider = Provider.of<DataProvider>(context, listen: false);
    try {
      // Replace this with your actual function call to get user's district
      final district = await dataProvider.getUserLocation();
      setState(() {
        _userDistrict = district;
      });
      // Automatically select this district in the provider
      dataProvider.selectDistrict(district);
    } catch (e) {
      // Handle error if needed
      print('Error loading user district: $e');
    }
  }

  void _assignBundle() async {
    if (_selectedTaluka == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please select a Taluka to assign.')),
      );
      return;
    }

    final dataProvider = Provider.of<DataProvider>(context, listen: false);
    try {
      final result = await dataProvider.assignWorkBundle(_selectedTaluka!);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result ?? "No message returned from API.")),
      );
      setState(() {
        _selectedTaluka = null;
      });
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
            content:
                Text(dataProvider.errorMessage ?? 'Failed to assign bundle.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Consumer<DataProvider>(
        builder: (context, dataProvider, child) {
          // Check for initial loading state
          if (dataProvider.isLoadingConfig) {
            return const Center(child: CircularProgressIndicator());
          }

          // Check if there's an error and no data to display.
          // Fallback to offline display.
          bool isOffline = dataProvider.errorMessage != null &&
              dataProvider.districts.isEmpty;

          List<String> availableTalukas = dataProvider.filteredTalukas;

          return Padding(
            padding: const EdgeInsets.all(16.0),
            child: SingleChildScrollView(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Assign New Work Bundle',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 20),

                  // Display user's district instead of dropdown
                  Container(
                    padding: const EdgeInsets.all(16.0),
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.grey),
                      borderRadius: BorderRadius.circular(4.0),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.location_on, color: Colors.green),
                        const SizedBox(width: 8),
                        Text(
                          _userDistrict ?? 'Loading district...',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 15),
                  DropdownButtonFormField<String>(
                    isExpanded: true,
                    value: _selectedTaluka,
                    hint: const Text('Select Taluka'),
                    items: availableTalukas.map((taluka) {
                      return DropdownMenuItem(
                        value: taluka,
                        child: Text(
                          taluka,
                          overflow: TextOverflow.ellipsis,
                        ),
                      );
                    }).toList(),
                    onChanged: isOffline
                        ? null
                        : (newValue) {
                            setState(() {
                              _selectedTaluka = newValue;
                            });
                          },
                    decoration: const InputDecoration(
                      border: OutlineInputBorder(),
                      labelText: 'Taluka',
                      contentPadding:
                          EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    ),
                  ),
                  const SizedBox(height: 20),
                  ElevatedButton(
                    onPressed: _assignBundle,
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 15),
                    ),
                    child: dataProvider.isAssigningBundle
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text(
                            'Assign Bundle',
                            style: TextStyle(fontSize: 18),
                          ),
                  ),
                  // Offline Message
                  if (isOffline)
                    Padding(
                      padding: const EdgeInsets.only(top: 20.0),
                      child: Text(
                        'Can\'t connect gracefully.',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                            color: Colors.red[700],
                            fontStyle: FontStyle.italic),
                      ),
                    ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}
