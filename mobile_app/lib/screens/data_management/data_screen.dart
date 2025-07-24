import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../models/member_model.dart'; // ✅ Sahi model ko import karein
import '../../providers/auth_provider.dart';
import '../../providers/data_provider.dart';

class DataScreen extends StatefulWidget {
  const DataScreen({super.key});

  @override
  State<DataScreen> createState() => _DataScreenState();
}

class _DataScreenState extends State<DataScreen> {
  // ... baaki ka code waisa hi rahega ...
  bool _isInit = true;

  @override
  void didChangeDependencies() {
    if (_isInit) {
      final token = Provider.of<AuthProvider>(context, listen: false).token;
      if (token != null) {
        Provider.of<DataProvider>(context, listen: false).fetchData(token);
      }
    }
    _isInit = false;
    super.didChangeDependencies();
  }

  @override
  Widget build(BuildContext context) {
    final dataProvider = Provider.of<DataProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Data Management'),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            onPressed: () {
              final token = Provider.of<AuthProvider>(context, listen: false).token;
              if (token != null) {
                Provider.of<DataProvider>(context, listen: false).fetchData(token);
              }
            },
          ),
        ],
      ),
      body: dataProvider.isLoading
          ? const Center(child: CircularProgressIndicator())
          : ListView.builder(
              itemCount: dataProvider.members.length,
              itemBuilder: (ctx, index) {
                final member = dataProvider.members[index];
                return ListTile(
                  title: Text(member.name),
                  // ✅ Ab yeh 'taluka' aaraam se milega
                  subtitle: Text(member.taluka),
                );
              },
            ),
    );
  }
}
