'use client'

import React, { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { AlertBox } from '@/components/alert-box'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react'
import { importMaster } from '@/lib/api/admin'
import { useAdminMutation } from '@/hooks/use-admin-api'

// Configuration dictionary for all 8 modules
const moduleConfigs: Record<string, {
  title: string
  description: string
  icon: string
  maxSizeMB: number
  expectedColumns: string
  columnNote: string
  initialHistory: Array<{ date: string; file: string; records: string; importedBy: string; status: string }>
}> = {
  medicines: {
    title: "Medicine Reference",
    description: "Import list of generic/brand medicine names, strengths, and dosage forms for prescription auto-suggest.",
    icon: "💊",
    maxSizeMB: 10,
    expectedColumns: "Generic Name, Brand Name, Strength, Dosage Form, Route",
    columnNote: "(minimum). Additional columns will be imported as-is.",
    initialHistory: [
      { date: '1 Jan 2026', file: 'medicines_v1.xlsx', records: '4,821', importedBy: 'Priya Admin', status: 'Active' },
      { date: '15 Dec 2025', file: 'medicines_base.csv', records: '4,500', importedBy: 'Rahul Admin', status: 'Archived' },
      { date: '01 Nov 2025', file: 'medicines_initial.csv', records: '3,200', importedBy: 'Priya Admin', status: 'Archived' },
    ]
  },
  tests: {
    title: "Diagnostic Tests Reference",
    description: "Import pathology and radiology test catalogs for clinical ordering and lab integration mapping.",
    icon: "🔬",
    maxSizeMB: 5,
    expectedColumns: "Test Code, Test Name, Category, Sample Type, Normal Range",
    columnNote: "(minimum). Category can be Pathology, Radiology, Cardiology, etc.",
    initialHistory: [
      { date: '2 Jan 2026', file: 'lab_tests_master.xlsx', records: '1,250', importedBy: 'Rahul Admin', status: 'Active' },
      { date: '12 Dec 2025', file: 'radiology_tests.csv', records: '420', importedBy: 'Priya Admin', status: 'Archived' },
      { date: '20 Nov 2025', file: 'pathology_v1.csv', records: '800', importedBy: 'Priya Admin', status: 'Archived' },
    ]
  },
  symptoms: {
    title: "Symptoms Reference Master",
    description: "Import common clinical symptoms to power smart auto-complete during patient triage and doctor consultation.",
    icon: "🌡️",
    maxSizeMB: 3,
    expectedColumns: "Symptom Name, Category, Common Synonyms, Snomed Code (optional)",
    columnNote: "Synonyms should be comma-separated.",
    initialHistory: [
      { date: '3 Jan 2026', file: 'symptoms_list.csv', records: '650', importedBy: 'Priya Admin', status: 'Active' },
      { date: '01 Dec 2025', file: 'symptoms_v1.xlsx', records: '500', importedBy: 'Rahul Admin', status: 'Archived' },
      { date: '15 Oct 2025', file: 'symptoms_base.csv', records: '450', importedBy: 'Priya Admin', status: 'Archived' },
    ]
  },
  diagnosis: {
    title: "Diagnosis Reference (ICD / Custom)",
    description: "Import diagnosis codes and descriptions for prescription auto-suggest. Free text always permitted.",
    icon: "🏥",
    maxSizeMB: 5,
    expectedColumns: "Code (optional), Description",
    columnNote: "ICD-10 codes recommended but not enforced.",
    initialHistory: [
      { date: '1 Jan 2026', file: 'diagnosis_icd10.csv', records: '12,440', importedBy: 'Priya Admin', status: 'Active' },
      { date: '10 Nov 2025', file: 'diagnosis_v2.xlsx', records: '11,800', importedBy: 'Rahul Admin', status: 'Archived' },
      { date: '05 Oct 2025', file: 'diagnosis_v1.csv', records: '10,000', importedBy: 'Priya Admin', status: 'Archived' },
    ]
  },
  "medical-council": {
    title: "Medical Council Reference",
    description: "Import official state and national medical council registries for doctor license verification.",
    icon: "🏛️",
    maxSizeMB: 5,
    expectedColumns: "Council ID, Council Name, State/Region, Country",
    columnNote: "Required for automated license verification workflows.",
    initialHistory: [
      { date: '4 Jan 2026', file: 'medical_councils_india.xlsx', records: '35', importedBy: 'Rahul Admin', status: 'Active' },
      { date: '18 Nov 2025', file: 'councils_global.csv', records: '120', importedBy: 'Priya Admin', status: 'Archived' },
      { date: '01 Oct 2025', file: 'councils_v1.csv', records: '28', importedBy: 'Priya Admin', status: 'Archived' },
    ]
  },
  colleges: {
    title: "Medical Colleges Reference",
    description: "Import accredited medical university and college databases for doctor qualification mapping.",
    icon: "🎓",
    maxSizeMB: 8,
    expectedColumns: "College Code, College Name, University, City, State, Country",
    columnNote: "Used in profile education verification steps.",
    initialHistory: [
      { date: '5 Jan 2026', file: 'medical_colleges_global.xlsx', records: '2,100', importedBy: 'Priya Admin', status: 'Active' },
      { date: '25 Nov 2025', file: 'colleges_india.csv', records: '750', importedBy: 'Rahul Admin', status: 'Archived' },
      { date: '10 Oct 2025', file: 'colleges_v1.csv', records: '600', importedBy: 'Priya Admin', status: 'Archived' },
    ]
  },
  specializations: {
    title: "Specializations Reference",
    description: "Import medical specialties and sub-specialty lists used for doctor directory filtering and matching.",
    icon: "🩺",
    maxSizeMB: 2,
    expectedColumns: "Specialty ID, Specialty Name, Department Category, Description",
    columnNote: "Ensures consistency across appointment booking filters.",
    initialHistory: [
      { date: '6 Jan 2026', file: 'specializations_master.csv', records: '85', importedBy: 'Rahul Admin', status: 'Active' },
      { date: '05 Dec 2025', file: 'specialties_v2.xlsx', records: '80', importedBy: 'Priya Admin', status: 'Archived' },
      { date: '15 Nov 2025', file: 'specialties_v1.csv', records: '70', importedBy: 'Priya Admin', status: 'Archived' },
    ]
  },
  qualifications: {
    title: "Qualifications Reference",
    description: "Import recognized medical degrees and certifications (e.g., MBBS, MD, MS, DM, MCh) for profile accuracy.",
    icon: "📜",
    maxSizeMB: 2,
    expectedColumns: "Qualification Code, Degree Name, Full Title, Level (UG/PG/Fellowship)",
    columnNote: "Powers qualification badge validations.",
    initialHistory: [
      { date: '7 Jan 2026', file: 'qualifications_master.csv', records: '140', importedBy: 'Priya Admin', status: 'Active' },
      { date: '10 Dec 2025', file: 'degrees_v2.xlsx', records: '130', importedBy: 'Priya Admin', status: 'Archived' },
      { date: '01 Nov 2025', file: 'degrees_v1.csv', records: '115', importedBy: 'Rahul Admin', status: 'Archived' },
    ]
  }
}

export default function MasterDataImportPage() {
  const params = useParams()
  const moduleKey = (params?.importmodual as string) || ''
  
  const config = moduleConfigs[moduleKey]

  const importMutation = useAdminMutation<File, unknown>(async (file) => {
    const resourceMap: Record<string, string> = {
      medicines: 'medicines',
      tests: 'lab-tests',
      symptoms: 'symptoms',
      diagnosis: 'diagnoses',
      'medical-council': 'medical-councils',
      colleges: 'colleges',
      specializations: 'specializations',
      qualifications: 'qualification-specializations',
    }
    const resource = resourceMap[moduleKey]
    if (!resource) throw new Error('Unsupported import module')
    return importMaster(resource, file)
  })


  // If module does not match our config keys, show a clean error view
  if (!config) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center text-2xl">
          ⚠️
        </div>
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Invalid Import Module</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            The module path <span className="font-mono text-foreground font-semibold">"{moduleKey}"</span> does not exist or is unrecognized in our master data registry.
          </p>
        </div>
        <Button asChild variant="default" className="mt-4 gap-2">
          <Link href="/dashboard">
            <ArrowLeft className="w-4 h-4" /> Go to Dashboard
          </Link>
        </Button>
      </div>
    )
  }

  const [history] = useState(config.initialHistory)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null)
    setSuccessMsg(null)
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      const fileExt = file.name.split('.').pop()?.toLowerCase()

      if (fileExt !== 'csv' && fileExt !== 'xlsx') {
        setErrorMsg('Invalid file format. Only .csv and .xlsx files are accepted.')
        return
      }

      const fileSizeMB = file.size / (1024 * 1024)
      if (fileSizeMB > config.maxSizeMB) {
        setErrorMsg(`File size exceeds limit. Max allowed size for this module is ${config.maxSizeMB} MB.`)
        return
      }

      setSelectedFile(file)
    }
  }

  const handleUploadSubmit = async () => {
    if (!selectedFile) return
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const result: any = await importMutation.mutateAsync(selectedFile)
      const summary = result?.records_inserted != null
        ? `${result.records_inserted} inserted, ${result.records_skipped_existing ?? 0} skipped.`
        : 'The server accepted the import.'
      setSuccessMsg(`Successfully imported ${selectedFile.name}. ${summary}`)
      setSelectedFile(null)
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight capitalize">
          {config.title} Import
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Admin imports master reference data for system auto-suggest and validation
        </p>
      </div>

      <AlertBox type="warning">
        <div>
          <span className="font-semibold">Requirement Note:</span> Clean structured Excel or CSV data is required to keep system lookups fully populated. All fields from the source file will be mapped and appended safely.
        </div>
      </AlertBox>

      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{config.icon}</span>
            <CardTitle>{config.title}</CardTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {config.description}
          </p>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:bg-muted/30 transition-colors relative cursor-pointer">
            <input
              type="file"
              accept=".csv, .xlsx"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="flex justify-center mb-3">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground mb-1">
              {selectedFile ? selectedFile.name : `Upload ${config.title} CSV / Excel`}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Accepted formats: .csv, .xlsx · Max limit {config.maxSizeMB} MB
            </p>
            <Button variant="outline" size="sm" type="button">
              {selectedFile ? 'Change File' : 'Choose File'}
            </Button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 p-3 bg-success/10 text-success rounded-lg text-xs font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {selectedFile && !successMsg && (
            <div className="flex justify-end">
              <Button onClick={handleUploadSubmit} disabled={importMutation.isPending} className="gap-2">
                <FileSpreadsheet className="w-4 h-4" /> Process & Import File
              </Button>
            </div>
          )}

          <div className="p-4 bg-muted/50 rounded-lg">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Expected column headers:</p>
            <p className="text-sm text-foreground font-mono">
              {config.expectedColumns}{' '}
              <span className="text-muted-foreground font-sans text-xs">{config.columnNote}</span>
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-sm mb-3">Recent Import History</h3>
            <div className="space-y-3">
              {history.map((entry, idx) => (
                <div key={idx} className="flex items-start justify-between p-3 border border-border rounded-lg bg-card shadow-xs">
                  <div className="flex-1">
                    <p className="font-medium text-sm text-foreground">{entry.file}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {entry.records} records · Imported by {entry.importedBy} on {entry.date}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={entry.status === 'Active' ? 'default' : 'secondary'} className={entry.status === 'Active' ? 'bg-success text-white' : ''}>
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <AlertBox type="info">
        <div>
          <span className="font-semibold">Note:</span> Uploading a new file safely appends and updates records matching unique keys. Duplicate entries are handled automatically.
        </div>
      </AlertBox>
    </div>
  )
}