import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  User,
  MapPin,
  FileText,
  Camera,
  Instagram,
  Twitter,
  Save,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import Layout from '../components/Layout';
import { usersApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

interface ProfileForm {
  fullName: string;
  bio: string;
  location: string;
  instagram: string;
  twitter: string;
  tiktok: string;
  facebook: string;
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const parseSocialLinks = () => {
    if (!user?.profile?.socialLinks) return {};
    try {
      return JSON.parse(user.profile.socialLinks) as Record<string, string>;
    } catch {
      return {};
    }
  };

  const socialLinks = parseSocialLinks();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      fullName: user?.profile?.fullName || '',
      bio: user?.profile?.bio || '',
      location: user?.profile?.location || '',
      instagram: socialLinks.instagram || '',
      twitter: socialLinks.twitter || '',
      tiktok: socialLinks.tiktok || '',
      facebook: socialLinks.facebook || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: ProfileForm) =>
      usersApi.updateProfile({
        fullName: data.fullName,
        bio: data.bio,
        location: data.location,
        socialLinks: {
          instagram: data.instagram || undefined,
          twitter: data.twitter || undefined,
          tiktok: data.tiktok || undefined,
          facebook: data.facebook || undefined,
        },
      }),
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      setSuccess('Profile updated successfully!');
      setError('');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Update failed');
      }
    },
  });

  const avatarMutation = useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);
      return usersApi.uploadAvatar(formData);
    },
    onSuccess: async () => {
      await refreshUser();
      setSuccess('Avatar updated!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: () => setError('Failed to upload avatar'),
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) avatarMutation.mutate(file);
    e.target.value = '';
  };

  const roleLabels: Record<string, string> = {
    PATIENT: 'Patient',
    CONTRIBUTOR: 'Contributor',
    SURGEON: 'Surgeon',
    ADMIN: 'Administrator',
  };

  const roleBadgeColors: Record<string, string> = {
    PATIENT: 'bg-primary-100 text-primary-700',
    CONTRIBUTOR: 'bg-blue-100 text-blue-700',
    SURGEON: 'bg-green-100 text-green-700',
    ADMIN: 'bg-red-100 text-red-700',
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Profile Settings</h1>

        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Avatar section */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Photo</h2>
            <div className="flex items-center gap-6">
              <div className="relative">
                {user?.profile?.avatarUrl ? (
                  <img
                    src={user.profile.avatarUrl}
                    alt="Avatar"
                    className="w-20 h-20 rounded-full object-cover border-4 border-primary-100"
                  />
                ) : (
                  <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-pink-100 rounded-full flex items-center justify-center border-4 border-primary-100">
                    <User className="w-10 h-10 text-primary-400" />
                  </div>
                )}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-7 h-7 bg-primary-600 hover:bg-primary-700 text-white rounded-full flex items-center justify-center shadow-md transition-colors"
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <p className="font-medium text-gray-900">{user?.profile?.fullName || user?.email}</p>
                <p className="text-sm text-gray-500">{user?.email}</p>
                <span className={`badge mt-1 ${roleBadgeColors[user?.role || 'PATIENT']}`}>
                  {roleLabels[user?.role || 'PATIENT']}
                </span>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            {avatarMutation.isPending && (
              <p className="text-sm text-gray-500 mt-2 flex items-center gap-1">
                <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                Uploading...
              </p>
            )}
          </div>

          {/* Profile info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <form onSubmit={handleSubmit((data) => updateMutation.mutate(data))} className="space-y-4">
              <div>
                <label className="form-label">Full Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input-field pl-9"
                    {...register('fullName', { required: 'Full name is required' })}
                  />
                </div>
                {errors.fullName && <p className="form-error">{errors.fullName.message}</p>}
              </div>

              <div>
                <label className="form-label">Bio</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    rows={3}
                    className="input-field pl-9 resize-none"
                    placeholder="Tell us about yourself..."
                    {...register('bio')}
                  />
                </div>
              </div>

              <div>
                <label className="form-label">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    className="input-field pl-9"
                    placeholder="City, Country"
                    {...register('location')}
                  />
                </div>
              </div>

              {/* Social links */}
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Social Media Links</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { name: 'instagram' as const, label: 'Instagram', placeholder: '@username', icon: <Instagram className="w-4 h-4" /> },
                    { name: 'twitter' as const, label: 'Twitter/X', placeholder: '@username', icon: <Twitter className="w-4 h-4" /> },
                    { name: 'tiktok' as const, label: 'TikTok', placeholder: '@username', icon: <span className="text-xs font-bold">TT</span> },
                    { name: 'facebook' as const, label: 'Facebook', placeholder: 'Profile URL', icon: <span className="text-xs font-bold">FB</span> },
                  ].map((social) => (
                    <div key={social.name}>
                      <label className="form-label text-xs">{social.label}</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {social.icon}
                        </span>
                        <input
                          type="text"
                          className="input-field pl-9 text-sm"
                          placeholder={social.placeholder}
                          {...register(social.name)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>

          {/* Account info */}
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Email</span>
                <span className="text-gray-900">{user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Type</span>
                <span className={`badge ${roleBadgeColors[user?.role || 'PATIENT']}`}>
                  {roleLabels[user?.role || 'PATIENT']}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Member Since</span>
                <span className="text-gray-900">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
