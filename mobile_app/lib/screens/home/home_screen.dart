import 'package:flutter/material.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  String? selectedDistrict;
  String? selectedTaluka;
  bool showAssignedBundle = false;

  final Map<String, List<String>> talukaMap = {
    'Chhatrapati Sambhaji Nagar': [
      'Soygav',
      'Kannad',
      'Sillod',
      'Khultabaad',
      'Phoolabri',
      'Paithan',
      'Vaijapur',
      'Gangapur',
    ],
    'Ahilyanagar': [
      'City 1',
      'City 2',
      'City 3',
    ],
  };

  List<String> get availableTalukas {
    return talukaMap[selectedDistrict] ?? [];
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                'Offline Sync Status',
                style: Theme.of(context).textTheme.titleLarge,
              ),
              const SizedBox(height: 6),
              const Text(
                'Your local device data summary. Go to Data Management to sync.',
                style: TextStyle(fontSize: 13),
              ),
              const SizedBox(height: 12),
              GridView.count(
                crossAxisCount: 2,
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                crossAxisSpacing: 12,
                mainAxisSpacing: 12,
                childAspectRatio: 2.2,
                children: const [
                  StatusCard(
                    title: 'Synced to Device',
                    value: '521',
                    icon: Icons.phone_android,
                    color: Colors.blue,
                  ),
                  StatusCard(
                    title: 'Locally Processed',
                    value: '0',
                    icon: Icons.check_circle,
                    color: Colors.green,
                  ),
                  StatusCard(
                    title: 'Pending to Process',
                    value: '521',
                    icon: Icons.hourglass_empty,
                    color: Colors.orange,
                  ),
                  StatusCard(
                    title: 'Pending Sync Out',
                    value: '0',
                    icon: Icons.sync_problem,
                    color: Colors.red,
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Padding(
                  padding: const EdgeInsets.all(14.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Assign Your Work', style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 4),
                      const Text(
                        'Select your active Taluka. You can assign a new bundle once the current one is complete and synced.',
                        style: TextStyle(fontSize: 13),
                      ),
                      const SizedBox(height: 16),

                      // District Dropdown
                      const Text('1. Select a District',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12),
                        ),
                        hint: const Text('Select a district'),
                        value: selectedDistrict,
                        items: talukaMap.keys.map((district) {
                          return DropdownMenuItem(
                            value: district,
                            child: Text(district),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            selectedDistrict = value;
                            selectedTaluka = null;
                            showAssignedBundle = false;
                          });
                        },
                      ),
                      const SizedBox(height: 16),

                      // Taluka Dropdown
                      const Text('2. Select a Taluka',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 6),
                      DropdownButtonFormField<String>(
                        decoration: const InputDecoration(
                          border: OutlineInputBorder(),
                          contentPadding: EdgeInsets.symmetric(horizontal: 12),
                        ),
                        hint: const Text('Select a taluka'),
                        value: selectedTaluka,
                        items: availableTalukas.map((taluka) {
                          return DropdownMenuItem(
                            value: taluka,
                            child: Text(taluka),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            selectedTaluka = value;
                            showAssignedBundle = false;
                          });
                        },
                      ),
                      const SizedBox(height: 16),

                      // Button
                      const Text('3. Get New Bundle',
                          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                      const SizedBox(height: 6),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: (selectedDistrict != null && selectedTaluka != null)
                              ? () {
                                  final overlay = Overlay.of(context);
                                  final overlayEntry = OverlayEntry(
                                    builder: (context) => Positioned(
                                      top: 40,
                                      right: 20,
                                      child: Material(
                                        color: Colors.transparent,
                                        child: Container(
                                          padding: const EdgeInsets.symmetric(
                                              vertical: 10, horizontal: 16),
                                          decoration: BoxDecoration(
                                            color: Colors.green,
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: const Text(
                                            'New bundle Assigned...',
                                            style:
                                                TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                                          ),
                                        ),
                                      ),
                                    ),
                                  );

                                  overlay.insert(overlayEntry);
                                  Future.delayed(const Duration(seconds: 2), () {
                                    overlayEntry.remove();
                                  });

                                  setState(() {
                                    showAssignedBundle = true;
                                  });
                                }
                              : null,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.green,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 12),
                          ),
                          child: const Text('Assign New Bundle'),
                        ),
                      ),

                      const SizedBox(height: 14),

                      if (showAssignedBundle && selectedTaluka != null)
                        Card(
                          margin: const EdgeInsets.only(top: 6),
                          elevation: 1,
                          shape:
                              RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          child: Padding(
                            padding: const EdgeInsets.all(12.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(selectedTaluka!,
                                        style: const TextStyle(
                                            fontSize: 16, fontWeight: FontWeight.bold)),
                                    Text(
                                      'Bundle #4',
                                      style: TextStyle(color: Colors.grey.shade600),
                                    )
                                  ],
                                ),
                                const Text(
                                  '0 / 250',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.green),
                                )
                              ],
                            ),
                          ),
                        )
                    ],
                  ),
                ),
              )
            ],
          ),
        )
      ],
    );
  }
}

class StatusCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const StatusCard({
    super.key,
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 1,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(8.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  value,
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: color,
                  ),
                ),
                Icon(icon, color: color, size: 22),
              ],
            ),
            Text(title, style: const TextStyle(fontSize: 11)),
          ],
        ),
      ),
    );
  }
}
