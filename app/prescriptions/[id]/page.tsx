'use client'

import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Printer, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ViewPrescriptionPage() {
  const params = useParams()
  const prescriptionId = (params?.id as string) || 'RX-2026-0814'

  // Dummy prescription data (can be replaced with API fetch)
  const prescription = {
    id: prescriptionId,
    patientName: "Ashish Sharma",
    careOf: "Ram Prasad",
    age: "24 Years",
    sex: "Male",
    phone: "6378732850",
    date: "14 Aug 2026",
    address: "test, jaipur t, jaipurp, Margao, Goa - 434343",
    complaints: "Abnormal Breathing Sounds",
    diagnosis: "Abnormal Distension - Bilateral",
    histopathology: "Histopathology",
    additionalDiagnosis: [
      "Accidental Inhalation Of Gastric Contents - Right",
      "Acute Cholecystitis - Upper Right"
    ],
    investigations: "-",
    medicines: [
      {
        id: 1,
        name: "3rd Generation Recombinant F VIII 1000 IU with diluent 500",
        dosage: "1-1-1",
        frequency: "Stat - Immediately / 5 Week",
        instructions: "DD"
      }
    ],
    advice: "No advice"
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-muted/40 py-8 px-4 sm:px-6">
      {/* Top Action Bar (Hidden during print) */}
      <div className="max-w-4xl mx-auto flex items-center justify-between mb-6 print:hidden">
        <Button variant="outline" asChild className="gap-2">
          <Link href="/patients">
            <ArrowLeft className="w-4 h-4" /> Back to List
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="w-4 h-4" /> Print
          </Button> 
          
        </div>
      </div>

      {/* Prescription Document Container */}
      <Card className="max-w-4xl mx-auto bg-card text-black shadow-lg border border-border print:shadow-none print:border-none">
        <CardContent className="p-8 sm:p-12 space-y-6">
          
          {/* Header / Patient Information Block */}
          <div className="border-b border-border pb-6 text-sm space-y-2">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><strong className="text-foreground">Patient :</strong> {prescription.patientName}</span>
              <span className="text-muted-foreground">|</span>
              <span><strong className="text-foreground">C/O :</strong> {prescription.careOf}</span>
              <span className="text-muted-foreground">|</span>
              <span><strong className="text-foreground">Age / Sex :</strong> {prescription.age} / {prescription.sex}</span>
              <span className="text-muted-foreground">|</span>
              <span><strong className="text-foreground">Phone :</strong> {prescription.phone}</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span><strong className="text-foreground">Date :</strong> {prescription.date}</span>
              <span className="text-muted-foreground">|</span>
              <span><strong className="text-foreground">Address :</strong> {prescription.address}</span>
            </div>
          </div>

          {/* Clinical Details Section */}
          <div className="space-y-4 text-sm border-b border-border pb-6">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="font-bold text-foreground">Complaints</span>
              <span className="sm:col-span-3 text-muted-foreground">{prescription.complaints}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="font-bold text-foreground">Diagnosis</span>
              <span className="sm:col-span-3 text-muted-foreground">
                {prescription.diagnosis} | <strong className="text-foreground">Histopathology:</strong> {prescription.histopathology}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="font-bold text-foreground">Additional Diagnosis</span>
              <span className="sm:col-span-3 text-muted-foreground">
                {prescription.additionalDiagnosis.join(" | ")}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              <span className="font-bold text-foreground">Investigations</span>
              <span className="sm:col-span-3 text-muted-foreground">{prescription.investigations}</span>
            </div>
          </div>

          {/* Medicines Section */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-2 font-serif font-black text-lg tracking-wider">
              <span className="text-2xl font-bold">℞</span> MEDICINES
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-foreground/80 text-foreground font-bold">
                    <th className="py-2.5 px-2 w-12">#</th>
                    <th className="py-2.5 px-2 w-2/5">MEDICINE</th>
                    <th className="py-2.5 px-2">DOSAGE</th>
                    <th className="py-2.5 px-2">FREQUENCY / DURATION</th>
                    <th className="py-2.5 px-2">INSTRUCTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {prescription.medicines.map((med) => (
                    <tr key={med.id}>
                      <td className="py-4 px-2 align-top font-medium">{med.id}</td>
                      <td className="py-4 px-2 align-top font-semibold text-foreground">{med.name}</td>
                      <td className="py-4 px-2 align-top">
                        <span className="inline-block bg-muted px-2 py-1 rounded font-mono text-xs font-bold border border-border">
                          {med.dosage}
                        </span>
                      </td>
                      <td className="py-4 px-2 align-top text-muted-foreground">{med.frequency}</td>
                      <td className="py-4 px-2 align-top text-muted-foreground">{med.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Advice Section */}
          <div className="space-y-2 pt-6 border-t border-border text-sm">
            <h3 className="font-bold tracking-wider text-foreground">ADVICE</h3>
            <p className="text-muted-foreground">{prescription.advice}</p>
          </div>

        </CardContent>
      </Card>
    </div>
  )
}