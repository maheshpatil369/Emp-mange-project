// lib/screens/data_management/data_screen.dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/data_provider.dart';

class DataScreen extends StatefulWidget {
  const DataScreen({Key? key}) : super(key: key);

  @override
  _DataScreenState createState() => _DataScreenState();
}

class _DataScreenState extends State<DataScreen> {
  @override
  void initState() {
    super.initState();
    // Screen khulte hi local data refresh karein
    WidgetsBinding.instance.addPostFrameCallback((_) {
      Provider.of<DataProvider>(context, listen: false).fetchLocalData();
    });
  }

  @override
  Widget build(BuildContext context) {
    // DataProvider se data sunein
    final dataProvider = Provider.of<DataProvider>(context);
    final records = dataProvider.records;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: () {
              // Manually refresh karne ke liye
              dataProvider.fetchLocalData();
            },
          )
        ],
      ),
      body: dataProvider.isLoading && records.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : records.isEmpty
              ? const Center(
                  child: Text(
                    'No data found on device.\nPlease go to Dashboard to download data.',
                    textAlign: TextAlign.center,
                    style: TextStyle(fontSize: 16, color: Colors.grey),
                  ),
                )
              : ListView.builder(
                  itemCount: records.length,
                  itemBuilder: (ctx, index) {
                    final record = records[index];
                    final isEdited = record['status'] == 'edited';
                    return Card(
                      margin: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor:
                              isEdited ? Colors.orange : Colors.indigo,
                          child: Text(
                            (index + 1).toString(),
                            style: const TextStyle(color: Colors.white),
                          ),
                        ),
                        title: Text(record['farmer_name'] ?? 'No Name'),
                        subtitle: Text('ID: ${record['intimation_no']}'),
                        trailing: Icon(
                          isEdited ? Icons.sync_problem : Icons.check_circle,
                          color: isEdited ? Colors.orange : Colors.green,
                        ),
                        onTap: () {
                          // TODO: Yahan par record ko edit karne ke liye
                          // ek nayi screen par bhejne ka code aayega.
                          // Example: Navigator.of(context).push(MaterialPageRoute(...))
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('Edit functionality to be added.'))
                          );
                        },
                      ),
                    );
                  },
                ),
    );
  }
}