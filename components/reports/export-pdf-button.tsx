"use client";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function ExportPdfButton({ locale }: { locale: string }) {
  const isHe = locale === "he";
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    toast.info(isHe ? "מכין PDF..." : "Preparing PDF...");

    // Give a brief delay so React can paint the current view
    await new Promise((r) => setTimeout(r, 200));

    try {
      // Use the browser's print-to-PDF functionality with print CSS
      // We apply special styles for printing, then trigger window.print()
      const style = document.createElement("style");
      style.id = "print-styles";
      style.textContent = `
        @media print {
          /* Hide navigation, topbar, floating buttons */
          aside, header, [data-tour], .fixed,
          button:not(.print-keep), nav {
            display: none !important;
          }
          /* Make main content full width */
          main {
            margin: 0 !important;
            padding: 8px !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          .min-h-screen { min-height: auto !important; }
          .flex.bg-muted\\/20 { display: block !important; }
          /* Ensure charts/cards render */
          .card-hover { break-inside: avoid; }
          /* Page settings */
          @page {
            size: A4 landscape;
            margin: 1cm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `;
      document.head.appendChild(style);

      window.print();

      // Cleanup
      setTimeout(() => {
        document.getElementById("print-styles")?.remove();
        setExporting(false);
        toast.success(
          isHe ? "PDF מוכן!" : "PDF ready!",
          { description: isHe ? "בחר 'שמור כ-PDF' בחלון ההדפסה" : "Select 'Save as PDF' in the print dialog" }
        );
      }, 500);
    } catch (err) {
      setExporting(false);
      toast.error(isHe ? "שגיאה ביצוא" : "Export error");
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={exporting}>
      {exporting ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Download className="size-4" />
      )}
      {isHe ? "ייצוא PDF" : "Export PDF"}
    </Button>
  );
}
