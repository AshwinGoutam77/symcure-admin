"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Search, XCircle } from "lucide-react";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import {
  getAppSpecialtyGroups,
  getAppSpecialtyGroup,
  getAppSpecialtyGroupSpecializationOptions,
  createAppSpecialtyGroup,
  updateAppSpecialtyGroup,
  setAppSpecialtyGroupStatus,
  uploadAppSpecialtyGroupImage,
  deleteAppSpecialtyGroupImage,
  deleteAppSpecialtyGroup,
} from "@/lib/api/admin";
import { Pagination } from "@/components/pagination";

type SpecialtyGroup = {
  id: string;
  title: string;
  sequence: number;
  image_url: string | null;
  is_active: boolean;
  specialization_count: number;
  doctor_count: number;
  created_at?: string;
  updated_at?: string;
  specializations?: Specialization[];
};

type Specialization = {
  id: string | number;
  name: string;
  is_active: boolean;
  is_selected?: boolean;
};

type Option = Specialization & {
  is_selected: boolean;
};

type FormState = {
  title: string;
  sequence: string;
  is_active: boolean;
  qualification_specialization_ids: string[];
};

const EMPTY_FORM: FormState = {
  title: "",
  sequence: "",
  is_active: true,
  qualification_specialization_ids: [],
};

export default function AppSpecialtyGroupsPage() {
  const [groups, setGroups] = useState<SpecialtyGroup[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<
    "" | "1" | "0"
  >("");

  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [meta, setMeta] = useState<any>(null);
  const [nextSequence, setNextSequence] = useState<
    number | null
  >(null);

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(
    null,
  );

  const [form, setForm] =
    useState<FormState>(EMPTY_FORM);

  const [options, setOptions] = useState<Option[]>([]);
  const [optionsLoading, setOptionsLoading] =
    useState(false);

  const [selectedImage, setSelectedImage] =
    useState<File | null>(null);

  const [existingImage, setExistingImage] =
    useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [statusId, setStatusId] =
    useState<string | null>(null);

  const [imageDeleting, setImageDeleting] =
    useState(false);

  const [error, setError] = useState("");

  // ------------------------------------------------------------
  // Load Groups
  // ------------------------------------------------------------

  const loadGroups = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await getAppSpecialtyGroups({
        search: search.trim() || undefined,
        is_active: activeFilter || undefined,
        page,
        limit,
      });

      setGroups(response?.data || []);
      setMeta(response?.meta || null);
      setNextSequence(
        response?.next_sequence ?? null,
      );
    } catch (err: any) {
      console.error(
        "Failed to load specialty groups:",
        err,
      );

      setError(
        err?.message ||
          "Failed to load App Specialty Groups.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [page, activeFilter]);

  // ------------------------------------------------------------
  // Search
  // ------------------------------------------------------------

  const handleSearch = (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setPage(1);

    loadGroups();
  };

  // ------------------------------------------------------------
  // Open Add Modal
  // ------------------------------------------------------------

  const openAddModal = async () => {
    setEditingId(null);

    setForm({
      ...EMPTY_FORM,
      sequence:
        nextSequence !== null
          ? String(nextSequence)
          : "",
    });

    setExistingImage(null);
    setSelectedImage(null);
    setError("");

    setShowModal(true);

    await loadSpecializationOptions();
  };

  // ------------------------------------------------------------
  // Open Edit Modal
  // ------------------------------------------------------------

  const openEditModal = async (
    id: string,
  ) => {
    try {
      setSaving(true);
      setError("");

      const response =
        await getAppSpecialtyGroup(id);

      const group: SpecialtyGroup =
        response?.specialty_group;

      if (!group) {
        throw new Error(
          "Specialty group information not found.",
        );
      }

      setEditingId(id);

      setForm({
        title: group.title || "",

        sequence:
          group.sequence !== undefined &&
          group.sequence !== null
            ? String(group.sequence)
            : "",

        is_active: Boolean(
          group.is_active,
        ),

        qualification_specialization_ids:
          (group.specializations || []).map(
            (item) => String(item.id),
          ),
      });

      setExistingImage(
        group.image_url || null,
      );

      setSelectedImage(null);

      setShowModal(true);

      await loadSpecializationOptions(id);
    } catch (err: any) {
      console.error(
        "Failed to load specialty group:",
        err,
      );

      setError(
        err?.message ||
          "Failed to load specialty group.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Load Specialization Options
  // ------------------------------------------------------------

  const loadSpecializationOptions = async (
    groupId?: string,
  ) => {
    try {
      setOptionsLoading(true);

      const response =
        await getAppSpecialtyGroupSpecializationOptions(
          {
            group_id:
              groupId || undefined,
          },
        );

      setOptions(
        response?.options || [],
      );
    } catch (err: any) {
      console.error(
        "Failed to load specialization options:",
        err,
      );

      setError(
        err?.message ||
          "Failed to load specialization options.",
      );
    } finally {
      setOptionsLoading(false);
    }
  };

  // ------------------------------------------------------------
  // Form Update
  // ------------------------------------------------------------

  const updateForm = (
    key: keyof FormState,
    value: any,
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  // ------------------------------------------------------------
  // Toggle Specialization
  // ------------------------------------------------------------

  const toggleSpecialization = (
    id: string | number,
  ) => {
    const value = String(id);

    setForm((prev) => {
      const exists =
        prev.qualification_specialization_ids.includes(
          value,
        );

      return {
        ...prev,

        qualification_specialization_ids:
          exists
            ? prev.qualification_specialization_ids.filter(
                (item) => item !== value,
              )
            : [
                ...prev.qualification_specialization_ids,
                value,
              ],
      };
    });
  };

  // ------------------------------------------------------------
  // Save
  // ------------------------------------------------------------

  const handleSave = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    setError("");

    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    if (
      form.title.trim().length > 100
    ) {
      setError(
        "Title cannot be more than 100 characters.",
      );
      return;
    }

    if (
      form
        .qualification_specialization_ids
        .length === 0
    ) {
      setError(
        "Please select at least one specialization.",
      );
      return;
    }

    if (form.sequence) {
      const sequence = Number(
        form.sequence,
      );

      if (
        !Number.isInteger(sequence) ||
        sequence <= 0
      ) {
        setError(
          "Sequence must be a positive integer.",
        );
        return;
      }
    }

    try {
      setSaving(true);

      if (editingId) {
        // EDIT

        await updateAppSpecialtyGroup(
          editingId,
          {
            title: form.title.trim(),

            sequence: form.sequence
              ? Number(form.sequence)
              : undefined,

            is_active:
              form.is_active,

            qualification_specialization_ids:
              form.qualification_specialization_ids,
          },
        );

        // Image is a separate endpoint.
        if (selectedImage) {
          await uploadAppSpecialtyGroupImage(
            editingId,
            selectedImage,
          );
        }
      } else {
        // CREATE

        if (selectedImage) {
          const formData =
            new FormData();

          formData.append(
            "title",
            form.title.trim(),
          );

          if (form.sequence) {
            formData.append(
              "sequence",
              form.sequence,
            );
          }

          formData.append(
            "is_active",
            form.is_active
              ? "1"
              : "0",
          );

          form
            .qualification_specialization_ids
            .forEach((id) => {
              formData.append(
                "qualification_specialization_ids[]",
                id,
              );
            });

          formData.append(
            "image",
            selectedImage,
          );

          await createAppSpecialtyGroup(
            formData,
          );
        } else {
          await createAppSpecialtyGroup({
            title:
              form.title.trim(),

            sequence: form.sequence
              ? Number(form.sequence)
              : undefined,

            is_active:
              form.is_active,

            qualification_specialization_ids:
              form.qualification_specialization_ids,
          });
        }
      }

      setShowModal(false);
      setForm(EMPTY_FORM);
      setSelectedImage(null);
      setExistingImage(null);
      setEditingId(null);

      await loadGroups();
    } catch (err: any) {
      console.error(
        "Failed to save specialty group:",
        err,
      );

      const apiError =
        err?.error ||
        err?.response?.data?.error;

      setError(
        apiError?.message ||
          err?.message ||
          "Failed to save specialty group.",
      );
    } finally {
      setSaving(false);
    }
  };

  // ------------------------------------------------------------
  // Status
  // ------------------------------------------------------------

  const handleStatusChange = async (
    group: SpecialtyGroup,
  ) => {
    try {
      setStatusId(group.id);
      setError("");

      await setAppSpecialtyGroupStatus(
        group.id,
        !group.is_active,
      );

      await loadGroups();
    } catch (err: any) {
      console.error(
        "Failed to update status:",
        err,
      );

      setError(
        err?.message ||
          "Failed to update group status.",
      );
    } finally {
      setStatusId(null);
    }
  };

  // ------------------------------------------------------------
  // Delete
  // ------------------------------------------------------------

  const handleDelete = async (
    group: SpecialtyGroup,
  ) => {
    const confirmed =
      window.confirm(
        `Are you sure you want to permanently delete "${group.title}"? This will also remove its specialization mappings and image.`,
      );

    if (!confirmed) return;

    try {
      setDeletingId(group.id);
      setError("");

      await deleteAppSpecialtyGroup(
        group.id,
      );

      await loadGroups();
    } catch (err: any) {
      console.error(
        "Failed to delete specialty group:",
        err,
      );

      setError(
        err?.message ||
          "Failed to delete specialty group.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  // ------------------------------------------------------------
  // Remove Image
  // ------------------------------------------------------------

  const handleRemoveImage =
    async () => {
      if (!editingId) return;

      const confirmed =
        window.confirm(
          "Remove this image?",
        );

      if (!confirmed) return;

      try {
        setImageDeleting(true);
        setError("");

        await deleteAppSpecialtyGroupImage(
          editingId,
        );

        setExistingImage(null);
      } catch (err: any) {
        console.error(
          "Failed to remove image:",
          err,
        );

        setError(
          err?.message ||
            "Failed to remove image.",
        );
      } finally {
        setImageDeleting(false);
      }
    };

  // ------------------------------------------------------------
  // Close Modal
  // ------------------------------------------------------------

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOptions([]);
    setSelectedImage(null);
    setExistingImage(null);
    setError("");
  };

  // ------------------------------------------------------------
  // Pagination
  // ------------------------------------------------------------

  const currentPage =
    Number(
      meta?.current_page || page,
    );

  const lastPage =
    Number(
      meta?.last_page || 1,
    );

  // ------------------------------------------------------------
  // Render
  // ------------------------------------------------------------

  return (
    <div className="flex w-full flex-col gap-5">
      {/* PAGE HEADER */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground/80">
            <span>Administration</span>
            <span>/</span>
            <span className="text-muted-foreground">App Specialty Groups</span>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            App Specialty Groups
          </h1>

          <p className="mt-1 text-xs text-muted-foreground">
            Manage specialty groups displayed on the patient app.
          </p>
        </div>

        <Button
          type="button"
          onClick={openAddModal}
          className="h-9 px-3 text-xs"
        >
          <Plus className="mr-1.5 size-4" />
          Add Group
        </Button>
      </div>

      {/* ERROR */}
      {error && !showModal && (
        <div className="flex items-start gap-3 rounded-lg border border-destructive/25 bg-destructive-soft px-4 py-3 text-xs text-destructive">
          <XCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* TABLE */}
      <section className="mt-0 overflow-hidden rounded-lg bg-card shadow-sm">
        <div className="flex flex-col gap-4 border-b border-border/60 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-base font-semibold text-foreground">
              Specialty Groups
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Manage groups, mappings, visibility and display order.
            </p>
          </div>

          <form
            onSubmit={handleSearch}
            className="flex w-full flex-col gap-2 sm:flex-row sm:items-center lg:w-auto"
          >
            <div className="relative w-full sm:w-[300px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search specialty groups..."
                className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-9 text-xs outline-none transition focus:bg-card focus:ring-2 focus:ring-border/60"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                    loadGroups();
                  }}
                  className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground/60 hover:bg-muted hover:text-muted-foreground"
                  aria-label="Clear search"
                >
                  <XCircle className="size-3.5" />
                </button>
              )}
            </div>

            <select
              value={activeFilter}
              onChange={(e) => {
                setActiveFilter(e.target.value as "" | "1" | "0");
                setPage(1);
              }}
              className="h-9 min-w-[145px] rounded-md border border-border bg-muted/50 px-3 text-xs text-muted-foreground outline-none transition focus:border-input focus:bg-card focus:ring-2 focus:ring-border/60"
            >
              <option value="">All Status</option>
              <option value="1">Active</option>
              <option value="0">Inactive</option>
            </select>

            <Button
              type="submit"
              variant="outline"
              className="h-9 px-3 text-xs"
            >
              Search
            </Button>
          </form>
        </div>

        {loading ? (
          <div className="px-5 py-12 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-input border-t-primary" />
              Loading specialty groups...
            </div>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-12 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground/70">
              <Search className="size-4" />
            </div>
            <p className="mt-3 text-sm font-medium text-foreground/80">
              No specialty groups found
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Create a group or change your search filters.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto px-5 mt-5">
            <DataTable
              columns={[
                {
                  header: "Image",
                  key: "image",
                  render: (_, row) =>
                    row.image_url ? (
                      <img
                        src={row.image_url}
                        alt={row.title}
                        className="h-9 w-9 rounded-md object-cover ring-1 ring-border"
                      />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-muted-foreground/70">
                        <span className="text-[10px] font-medium">IMG</span>
                      </div>
                    ),
                },
                {
                  header: "Group",
                  key: "title",
                  render: (_, row) => (
                    <div className="min-w-0">
                      <p className="max-w-[220px] truncate text-[12px] font-semibold text-foreground">
                        {row.title}
                      </p>
                      <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                        ID: {row.id}
                      </p>
                    </div>
                  ),
                },
                {
                  header: "Sequence",
                  key: "sequence",
                  render: (value) => (
                    <span className="inline-flex min-w-7 justify-center rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      {value}
                    </span>
                  ),
                },
                {
                  header: "Specializations",
                  key: "specialization_count",
                  render: (value) => (
                    <span className="text-sm font-medium text-foreground/80">
                      {value ?? 0}
                    </span>
                  ),
                },
                {
                  header: "Doctors",
                  key: "doctor_count",
                  render: (value) => (
                    <span className="text-sm font-medium text-foreground/80">
                      {value ?? 0}
                    </span>
                  ),
                },
                {
                  header: "Status",
                  key: "is_active",
                  render: (_, row) => (
                    <button
                      type="button"
                      disabled={statusId === row.id}
                      onClick={() => handleStatusChange(row as SpecialtyGroup)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition ${
                        row.is_active
                          ? "bg-success-soft text-success hover:opacity-90"
                          : "bg-muted text-muted-foreground hover:bg-border"
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          row.is_active ? "bg-success" : "bg-muted-foreground/40"
                        }`}
                      />
                      {statusId === row.id
                        ? "Updating..."
                        : row.is_active
                          ? "Active"
                          : "Inactive"}
                    </button>
                  ),
                },
                {
                  header: "",
                  key: "actions",
                  render: (_, row) => (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => openEditModal(row.id)}
                        className="cursor-pointer flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === row.id}
                        onClick={() => handleDelete(row as SpecialtyGroup)}
                        className="cursor-pointer flex h-8 items-center rounded-md px-2.5 text-xs font-medium text-destructive transition hover:bg-destructive-soft disabled:opacity-50"
                      >
                        {deletingId === row.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  ),
                },
              ]}
              data={groups}
            />
          </div>
        )}

      {!loading && groups.length > 0 && (
  <div className="flex flex-col gap-3 border-t border-border/60 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-xs text-muted-foreground/80">
      Showing{" "}
      <span className="font-medium text-muted-foreground">
        {(currentPage - 1) *
          Number(meta?.per_page ?? limit) +
          1}
      </span>
      {" – "}
      <span className="font-medium text-muted-foreground">
        {Math.min(
          currentPage *
            Number(meta?.per_page ?? limit),
          Number(meta?.total ?? groups.length),
        )}
      </span>
      {" of "}
      <span className="font-medium text-muted-foreground">
        {Number(meta?.total ?? groups.length)}
      </span>
    </p>

    <Pagination
      currentPage={currentPage}
      totalPages={lastPage}
      disabled={loading}
      onPageChange={(nextPage) => {
        setPage(nextPage);
      }}
    />
  </div>
)}
      </section>

      {/* ======================================================
          ADD / EDIT MODAL
      ====================================================== */}

      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-foreground/50 p-4 backdrop-blur-[2px]">

          <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl dark:border-muted-foreground/50 dark:bg-foreground">

            {/* Modal Header */}
            <div className="flex shrink-0 items-center justify-between border-b border-border bg-card px-6 py-4 dark:border-muted-foreground/50 dark:bg-foreground">

              <div className="flex items-center gap-3">

                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    className="h-5 w-5"
                  >
                    <rect
                      width="18"
                      height="18"
                      x="3"
                      y="3"
                      rx="3"
                    />
                    <path d="M3 9h18" />
                    <path d="M9 3v18" />
                  </svg>
                </div>

                <div>
                  <h2 className="text-base font-semibold tracking-tight text-foreground dark:text-white">
                    {editingId
                      ? "Edit Specialty Group"
                      : "Add Specialty Group"}
                  </h2>

                  <p className="mt-0.5 text-xs text-muted-foreground dark:text-muted-foreground/80">
                    {editingId
                      ? "Update the group details and specializations."
                      : "Create a specialty group for the patient app."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="cursor-pointer flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground/80 transition hover:bg-muted hover:text-foreground/80 disabled:opacity-50 dark:hover:bg-foreground/80 dark:hover:text-white"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Form */}
            <form
              onSubmit={handleSave}
              className="min-h-0 flex-1 overflow-y-auto"
            >

              <div className="space-y-6 px-6 py-5">

                {/* Modal Error */}
                {error && (
                  <div className="flex items-start gap-3 rounded-xl border border-destructive/25 bg-destructive-soft px-4 py-3 text-sm text-destructive dark:border-destructive/50 dark:bg-destructive/90 dark:text-destructive">

                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      className="mt-0.5 h-4 w-4 shrink-0"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="9"
                      />

                      <path d="M12 8v4" />

                      <path d="M12 16h.01" />
                    </svg>

                    <span>{error}</span>
                  </div>
                )}

                {/* Basic Information */}
                <div>
                  <div className="mb-4">
                    <h3 className="text-sm font-semibold text-foreground dark:text-white">
                      Basic Information
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground/80">
                      Set the name, display order and
                      visibility of this group.
                    </p>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-[1fr_160px]">

                    {/* Title */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-muted-foreground/50">
                        Group Title
                        <span className="ml-1 text-destructive">
                          *
                        </span>
                      </label>

                      <input
                        type="text"
                        maxLength={100}
                        value={form.title}
                        onChange={(e) =>
                          updateForm(
                            "title",
                            e.target.value,
                          )
                        }
                        placeholder="e.g. Cardiology"
                        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-muted-foreground/50 dark:bg-foreground dark:text-white"
                      />

                      <div className="mt-1.5 flex justify-end text-xs text-muted-foreground/80">
                        {form.title.length}/100
                      </div>
                    </div>

                    {/* Sequence */}
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-foreground/80 dark:text-muted-foreground/50">
                        Sequence
                      </label>

                      <input
                        type="number"
                        min={1}
                        value={form.sequence}
                        onChange={(e) =>
                          updateForm(
                            "sequence",
                            e.target.value,
                          )
                        }
                        placeholder={
                          nextSequence
                            ? String(
                                nextSequence,
                              )
                            : "Next"
                        }
                        className="h-10 w-full rounded-lg border border-border bg-card px-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground/80 focus:border-primary focus:ring-2 focus:ring-primary/10 dark:border-muted-foreground/50 dark:bg-foreground dark:text-white"
                      />

                      <p className="mt-1.5 text-xs text-muted-foreground/80">
                        Unique positive number
                      </p>
                    </div>
                  </div>
                </div>

                {/* Status */}
                <div className="rounded-xl border border-border bg-muted/50 p-4 dark:border-muted-foreground/50 dark:bg-foreground/40">

                  <div className="flex items-center justify-between gap-4">

                    <div>
                      <div className="text-sm font-semibold text-foreground dark:text-white">
                        Group Status
                      </div>

                      <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground/80">
                        Inactive groups won't appear on the
                        patient app.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        updateForm(
                          "is_active",
                          !form.is_active,
                        )
                      }
                      className={`cursor-pointer relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                        form.is_active
                          ? "bg-primary"
                          : "bg-border dark:bg-foreground/80"
                      }`}
                    >
                      <span
                        className={`absolute top-1 h-4 w-4 rounded-full bg-card shadow-sm transition-all ${
                          form.is_active
                            ? "left-6"
                            : "left-1"
                        }`}
                      />
                    </button>
                  </div>

                  <div className="mt-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                        form.is_active
                          ? "bg-success-soft text-success dark:bg-success/90 dark:text-success"
                          : "bg-muted text-muted-foreground dark:bg-foreground/80 dark:text-muted-foreground/80"
                      }`}
                    >
                      {form.is_active
                        ? "Visible on patient app"
                        : "Hidden from patient app"}
                    </span>
                  </div>
                </div>

                {/* Image */}
                <div>

                  <div className="mb-3">
                    <h3 className="text-sm font-semibold text-foreground dark:text-white">
                      Group Image
                    </h3>

                    <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground/80">
                      JPG, JPEG, PNG or WebP · Maximum 2 MB
                    </p>
                  </div>

                  <div className="flex flex-col gap-4 rounded-xl border border-dashed border-input bg-muted/50 p-4 sm:flex-row sm:items-center dark:border-muted-foreground/50 dark:bg-foreground/30">

                    {/* Preview */}
                    <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-border bg-card dark:border-muted-foreground/50 dark:bg-foreground">

                      {selectedImage ? (
                        <img
                          src={URL.createObjectURL(
                            selectedImage,
                          )}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : existingImage ? (
                        <img
                          src={existingImage}
                          alt={form.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground/80">

                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.5"
                            className="h-7 w-7"
                          >
                            <rect
                              width="18"
                              height="18"
                              x="3"
                              y="3"
                              rx="2"
                            />

                            <circle
                              cx="8.5"
                              cy="8.5"
                              r="1.5"
                            />

                            <path d="m21 15-5-5L5 21" />
                          </svg>

                          <span className="mt-1 text-xs">
                            No image
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Upload */}
                    <div className="min-w-0 flex-1">

                      <input
                        id="specialty-group-image"
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file =
                            e.target.files?.[0] ||
                            null;

                          if (!file) return;

                          if (
                            file.size >
                            2 *
                              1024 *
                              1024
                          ) {
                            setError(
                              "Image must be 2 MB or smaller.",
                            );

                            e.target.value =
                              "";

                            return;
                          }

                          setError("");
                          setSelectedImage(
                            file,
                          );
                        }}
                      />

                      <div className="flex flex-wrap items-center gap-2">

                        <label
                          htmlFor="specialty-group-image"
                          className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground/80 transition hover:bg-muted/50 dark:border-muted-foreground/50 dark:bg-foreground dark:text-muted-foreground/50 dark:hover:bg-foreground/80"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            className="h-4 w-4"
                          >
                            <path d="M12 16V4" />
                            <path d="m7 9 5-5 5 5" />
                            <path d="M5 20h14" />
                          </svg>

                          {existingImage ||
                          selectedImage
                            ? "Change image"
                            : "Upload image"}
                        </label>

                        {existingImage &&
                          !selectedImage && (
                            <button
                              type="button"
                              disabled={
                                imageDeleting
                              }
                              onClick={
                                handleRemoveImage
                              }
                              className="cursor-pointer rounded-lg px-3 py-2 text-xs font-medium text-destructive transition hover:bg-destructive-soft dark:hover:bg-destructive/90"
                            >
                              {imageDeleting
                                ? "Removing..."
                                : "Remove"}
                            </button>
                          )}
                      </div>

                      {selectedImage && (
                        <div className="mt-2 truncate text-xs text-muted-foreground">
                          Selected:{" "}
                          <span className="font-medium text-foreground/80 dark:text-muted-foreground/50">
                            {selectedImage.name}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specializations */}
                <div>

                  <div className="mb-3 flex items-end justify-between gap-3">

                    <div>
                      <h3 className="text-sm font-semibold text-foreground dark:text-white">
                        Specializations
                        <span className="ml-1 text-destructive">
                          *
                        </span>
                      </h3>

                      <p className="mt-1 text-xs text-muted-foreground dark:text-muted-foreground/80">
                        Doctors with any selected specialization
                        will match this group.
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                      {
                        form
                          .qualification_specialization_ids
                          .length
                      }{" "}
                      selected
                    </span>
                  </div>

                  {optionsLoading ? (
                    <div className="rounded-xl border border-border px-4 py-10 text-center text-sm text-muted-foreground dark:border-muted-foreground/50">
                      <div className="inline-flex items-center gap-2">
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-input border-t-primary" />
                        Loading specializations...
                      </div>
                    </div>
                  ) : options.length === 0 ? (
                    <div className="rounded-xl border border-border px-4 py-10 text-center text-sm text-muted-foreground dark:border-muted-foreground/50">
                      No specializations available.
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto rounded-xl border border-border p-2 dark:border-muted-foreground/50">

                      <div className="grid gap-1.5 sm:grid-cols-2">

                        {options.map(
                          (option) => {
                            const selected =
                              form
                                .qualification_specialization_ids
                                .includes(
                                  String(
                                    option.id,
                                  ),
                                );

                            return (
                              <label
                                key={
                                  option.id
                                }
                                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                                  selected
                                    ? "border-primary/30 bg-primary/5"
                                    : "border-transparent hover:bg-muted/50 dark:hover:bg-foreground"
                                } ${
                                  !option.is_active &&
                                  !selected
                                    ? "cursor-not-allowed opacity-60"
                                    : ""
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={
                                    selected
                                  }
                                  disabled={
                                    !option.is_active &&
                                    !selected
                                  }
                                  onChange={() =>
                                    toggleSpecialization(
                                      option.id,
                                    )
                                  }
                                  className="h-4 w-4 rounded border-input text-primary focus:ring-primary"
                                />

                                <div className="min-w-0 flex-1">

                                  <div className="truncate text-sm font-medium text-foreground/80 dark:text-muted-foreground/50">
                                    {
                                      option.name
                                    }
                                  </div>

                                  {!option.is_active && (
                                    <div className="mt-0.5 text-xs font-medium text-warning">
                                      Inactive · Existing mapping
                                    </div>
                                  )}
                                </div>
                              </label>
                            );
                          },
                        )}
                      </div>
                    </div>
                  )}

                  <p className="mt-2 text-xs text-muted-foreground/80">
                    At least one specialization is required.
                  </p>
                </div>
              </div>

              {/* ==================================================
                  STICKY FOOTER
              ================================================== */}

              <div className="sticky bottom-0 z-20 flex items-center justify-end gap-3 border-t border-border bg-white/95 px-6 py-4 backdrop-blur dark:border-muted-foreground/50 dark:bg-foreground/95">

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="cursor-pointer h-10 rounded-lg border border-border bg-card px-4 text-sm font-medium text-foreground/80 transition hover:bg-muted/50 disabled:opacity-50 dark:border-muted-foreground/50 dark:bg-foreground dark:text-muted-foreground/50 dark:hover:bg-foreground/80"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    saving ||
                    optionsLoading ||
                    form
                      .qualification_specialization_ids
                      .length === 0
                  }
                  className="cursor-pointer h-10 min-w-[125px] rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                      ? "Update Group"
                      : "Create Group"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}