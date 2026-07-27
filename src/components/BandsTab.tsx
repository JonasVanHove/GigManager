"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "./AuthProvider";
import { useSettings } from "./SettingsProvider";
import { useToast } from "./ToastContainer";
import { Icons } from "./Icons";
import { supabaseClient } from "@/lib/supabase-client";

interface Band {
  id: string;
  name: string;
  logoUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface BandMember {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  bands: string[];
  updatedAt: string;
}

export default function BandsTab() {
  const { getAccessToken } = useAuth();
  const { language } = useSettings();
  const toast = useToast();

  const [bands, setBands] = useState<Band[]>([]);
  const [members, setMembers] = useState<BandMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBand, setEditingBand] = useState<Band | null>(null);
  const [formData, setFormData] = useState({ name: "", logoUrl: "" });
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const copy = language === "nl"
    ? {
        title: "Bands",
        addBand: "Nieuwe band",
        editBand: "Band bewerken",
        deleteBand: "Band verwijderen",
        cancel: "Annuleren",
        save: "Opslaan",
        name: "Naam",
        logo: "Logo",
        members: "Leden",
        noBands: "Nog geen bands",
        addFirstBand: "Maak je eerste band aan om te beginnen",
        uploadLogo: "Logo uploaden",
        removeLogo: "Logo verwijderen",
        bandMembers: "Bandleden",
        assignMembers: "Leden toewijzen",
        noMembers: "Geen leden toegewezen",
        successAdd: "Band toegevoegd",
        successUpdate: "Band bijgewerkt",
        successDelete: "Band verwijderd",
        errorLoad: "Fout bij laden bands",
        errorSave: "Fout bij opslaan band",
        errorDelete: "Fout bij verwijderen band",
      }
    : {
        title: "Bands",
        addBand: "New Band",
        editBand: "Edit Band",
        deleteBand: "Delete Band",
        cancel: "Cancel",
        save: "Save",
        name: "Name",
        logo: "Logo",
        members: "Members",
        noBands: "No bands yet",
        addFirstBand: "Create your first band to get started",
        uploadLogo: "Upload Logo",
        removeLogo: "Remove Logo",
        bandMembers: "Band Members",
        assignMembers: "Assign Members",
        noMembers: "No members assigned",
        successAdd: "Band added",
        successUpdate: "Band updated",
        successDelete: "Band deleted",
        errorLoad: "Error loading bands",
        errorSave: "Error saving band",
        errorDelete: "Error deleting band",
      };

  const loadBands = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No auth token");
      const response = await fetch("/api/bands", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch bands");
      const data = await response.json();
      setBands(data);
    } catch (error) {
      toast.error(copy.errorLoad);
    }
  }, [getAccessToken, toast, copy.errorLoad]);

  const loadMembers = useCallback(async () => {
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No auth token");
      const response = await fetch("/api/band-members", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch members");
      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error("Failed to load members:", error);
    }
  }, [getAccessToken]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([loadBands(), loadMembers()]);
      setLoading(false);
    };
    loadData();
  }, [loadBands, loadMembers]);

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const fileName = `band-logo-${Date.now()}-${crypto.randomUUID()}.${ext}`;
      
      const { error } = await supabaseClient.storage.from("bands").upload(fileName, file, { upsert: true });
      if (error) throw new Error("Failed to upload logo");
      
      const { data } = supabaseClient.storage.from("bands").getPublicUrl(fileName);
      setLogoPreview(data.publicUrl);
      setFormData({ ...formData, logoUrl: data.publicUrl });
    } catch (error) {
      toast.error("Failed to upload logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error(language === "nl" ? "Naam is verplicht" : "Name is required");
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No auth token");

      if (editingBand) {
        // Update existing band (only logo can be edited)
        const response = await fetch("/api/bands", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ id: editingBand.id, logoUrl: formData.logoUrl || null }),
        });

        if (!response.ok) throw new Error(copy.errorSave);
        toast.success(copy.successUpdate);
      } else {
        // Create new band
        const response = await fetch("/api/bands", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: formData.name.trim(), logoUrl: formData.logoUrl || null }),
        });

        if (!response.ok) throw new Error(copy.errorSave);
        toast.success(copy.successAdd);
      }

      setShowForm(false);
      setEditingBand(null);
      setFormData({ name: "", logoUrl: "" });
      setLogoPreview(null);
      loadBands();
    } catch (error) {
      toast.error(copy.errorSave);
    }
  };

  const handleEdit = (band: Band) => {
    setEditingBand(band);
    setFormData({ name: band.name, logoUrl: band.logoUrl || "" });
    setLogoPreview(band.logoUrl || null);
    setShowForm(true);
  };

  const handleDelete = async (band: Band) => {
    if (!confirm(language === "nl" ? `Ben je zeker dat je "${band.name}" wilt verwijderen?` : `Are you sure you want to delete "${band.name}"?`)) {
      return;
    }

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("No auth token");

      const response = await fetch(`/api/bands/${band.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) throw new Error(copy.errorDelete);

      toast.success(copy.successDelete);
      loadBands();
    } catch (error) {
      toast.error(copy.errorDelete);
    }
  };

  const getBandMembers = (bandId: string) => {
    return members.filter((member) => member.bands?.includes(bandId));
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{copy.title}</h1>
        <button
          onClick={() => {
            setEditingBand(null);
            setFormData({ name: "", logoUrl: "" });
            setLogoPreview(null);
            setShowForm(true);
          }}
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600"
        >
          {copy.addBand}
        </button>
      </div>

      {showForm && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
            {editingBand ? copy.editBand : copy.addBand}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {copy.name}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                {copy.logo}
              </label>
              <div className="mt-2 flex items-center gap-4">
                {logoPreview && (
                  <img src={logoPreview} alt="Logo preview" className="h-16 w-16 rounded-lg object-cover" />
                )}
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                  {uploadingLogo ? "Uploading..." : copy.uploadLogo}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleLogoUpload(file);
                    }}
                    className="hidden"
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setLogoPreview(null);
                      setFormData({ ...formData, logoUrl: "" });
                    }}
                    className="text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                  >
                    {copy.removeLogo}
                  </button>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingBand(null);
                  setFormData({ name: "", logoUrl: "" });
                  setLogoPreview(null);
                }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                {copy.cancel}
              </button>
              <button
                type="submit"
                disabled={uploadingLogo}
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 dark:bg-brand-500 dark:hover:bg-brand-600 disabled:opacity-50"
              >
                {copy.save}
              </button>
            </div>
          </form>
        </div>
      )}

     {bands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <Icons.People className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <p className="text-slate-600 dark:text-slate-400">{copy.noBands}</p>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-500">{copy.addFirstBand}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {bands.map((band) => {
            const bandMembers = getBandMembers(band.id);
            return (
              <div key={band.id} className="rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {band.logoUrl && (
                      <img src={band.logoUrl} alt={band.name} className="h-12 w-12 rounded-lg object-cover" />
                    )}
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{band.name}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        {bandMembers.length} {language === "nl" ? "leden" : "members"}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(band)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                    >
                      <Icons.Edit className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(band)}
                      className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 dark:text-slate-400 dark:hover:bg-red-900/20 dark:hover:text-red-400"
                    >
                      <Icons.Trash className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {bandMembers.length > 0 && (
                  <div className="mt-4">
                    <p className="mb-2 text-xs font-medium text-slate-500 dark:text-slate-400">{copy.bandMembers}</p>
                    <div className="flex flex-wrap gap-2">
                      {bandMembers.map((member) => (
                        <span
                          key={member.id}
                          className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        >
                          {member.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
