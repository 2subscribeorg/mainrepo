import Capacitor
import UIKit

@objc(FileSaverPlugin)
public class FileSaverPlugin: CAPPlugin, UIDocumentPickerDelegate {

    private var savedCall: CAPPluginCall?
    private var tempFileURL: URL?

    @objc func saveFile(_ call: CAPPluginCall) {
        let filename = call.getString("filename") ?? "export.csv"
        let content = call.getString("content") ?? ""

        let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
        do {
            try content.write(to: tempURL, atomically: true, encoding: .utf8)
        } catch {
            call.reject("Failed to write temp file: \(error.localizedDescription)")
            return
        }

        savedCall = call
        tempFileURL = tempURL

        DispatchQueue.main.async {
            let picker = UIDocumentPickerViewController(forExporting: [tempURL], asCopy: true)
            picker.delegate = self
            self.bridge?.viewController?.present(picker, animated: true)
        }
    }

    public func documentPicker(_ controller: UIDocumentPickerViewController, didPickDocumentsAt urls: [URL]) {
        savedCall?.resolve()
        savedCall = nil
        cleanupTempFile()
    }

    public func documentPickerWasCancelled(_ controller: UIDocumentPickerViewController) {
        savedCall?.reject("CANCELLED")
        savedCall = nil
        cleanupTempFile()
    }

    private func cleanupTempFile() {
        if let url = tempFileURL {
            try? FileManager.default.removeItem(at: url)
            tempFileURL = nil
        }
    }
}
