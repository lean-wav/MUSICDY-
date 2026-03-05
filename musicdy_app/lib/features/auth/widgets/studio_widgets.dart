import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

class StudioStat extends StatelessWidget {
  final String label;
  final String value;

  const StudioStat({super.key, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(
          value,
          style: GoogleFonts.outfit(
            color: Colors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        Text(
          label.toUpperCase(),
          style: GoogleFonts.inter(
            color: Colors.white38,
            fontSize: 9,
            letterSpacing: 1.2,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class StudioButton extends StatelessWidget {
  final String label;
  final VoidCallback onPressed;
  final bool isPrimary;
  final IconData? icon;

  const StudioButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.isPrimary = false,
    this.icon,
  });

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onPressed,
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 14),
          decoration: BoxDecoration(
            color: isPrimary ? Colors.white : Colors.transparent,
            borderRadius: BorderRadius.circular(2),
            border: isPrimary ? null : Border.all(color: Colors.white10),
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(
                  icon,
                  color: isPrimary ? Colors.black : Colors.white,
                  size: 16,
                ),
                const SizedBox(width: 8),
              ],
              Text(
                label,
                style: GoogleFonts.inter(
                  color: isPrimary ? Colors.black : Colors.white,
                  fontWeight: FontWeight.w700,
                  fontSize: 11,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final String title;
  const SectionHeader({super.key, required this.title});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      child: Row(
        children: [
          Text(
            title.toUpperCase(),
            style: GoogleFonts.inter(
              color: Colors.white,
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 2,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(child: Container(height: 1, color: Colors.white10)),
        ],
      ),
    );
  }
}

class StudioFolder extends StatelessWidget {
  final String name;
  final int fileCount;
  final bool isPublic;
  final List<Widget> children;

  const StudioFolder({
    super.key,
    required this.name,
    required this.fileCount,
    required this.isPublic,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12, left: 16, right: 16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.01),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.white10),
      ),
      child: ExpansionTile(
        shape: const RoundedRectangleBorder(side: BorderSide.none),
        collapsedShape: const RoundedRectangleBorder(side: BorderSide.none),
        iconColor: Colors.white,
        collapsedIconColor: Colors.white24,
        leading: const Icon(
          Icons.folder_open_rounded,
          color: Colors.amberAccent,
          size: 20,
        ),
        title: Text(
          name,
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
        subtitle: Text(
          "$fileCount stems • ${isPublic ? 'PÚBLICO' : 'PRIVADO'}",
          style: GoogleFonts.inter(
            color: Colors.white24,
            fontSize: 10,
            letterSpacing: 0.5,
          ),
        ),
        children: children,
      ),
    );
  }
}

class AnalyticBar extends StatelessWidget {
  final String label;
  final double value; // 0.0 to 1.0
  final String amount;

  const AnalyticBar({
    super.key,
    required this.label,
    required this.value,
    required this.amount,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                label,
                style: GoogleFonts.inter(
                  color: Colors.white70,
                  fontSize: 11,
                  fontWeight: FontWeight.w500,
                ),
              ),
              Text(
                amount,
                style: GoogleFonts.inter(
                  color: Colors.white,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
          const SizedBox(height: 10),
          Stack(
            children: [
              Container(
                height: 2,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.white10,
                  borderRadius: BorderRadius.circular(1),
                ),
              ),
              FractionallySizedBox(
                widthFactor: value,
                child: Container(
                  height: 2,
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(1),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
