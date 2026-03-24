import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  Stethoscope,
  Star,
  CheckCircle,
  Clock,
  Building,
  Phone,
  Globe,
  FileSignature,
  Edit2,
  Save,
  XCircle,
} from 'lucide-react';
import Layout from '../components/Layout';
import { surgeonsApi, adminApi } from '../api/client';
import { SurgeonProfile, SubscriptionTier, Listing } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';
import axios from 'axios';

interface ProfileForm {
  licenseNumber: string;
  specialty: string;
  officeName: string;
  officeAddress: string;
  phone: string;
  website: string;
  bio: string;
}

export default function SurgeonDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['surgeon-profile'],
    queryFn: () => surgeonsApi.getProfile(),
    select: (res) => res.data,
  });

  const { data: tiersData } = useQuery({
    queryKey: ['subscription-tiers'],
    queryFn: () => adminApi.getSubscriptionTiers(),
    select: (res) => res.data,
  });

  const { data: listingsData } = useQuery({
    queryKey: ['surgeon-listings'],
    queryFn: () => surgeonsApi.getListings(),
    select: (res) => res.data,
  });

  const profile: SurgeonProfile | undefined = profileData?.profile;
  const tiers: SubscriptionTier[] = tiersData?.tiers?.filter((t: SubscriptionTier) => t.isActive) ?? [];
  const listings: Listing[] = listingsData?.listings ?? [];

  const activeSubscription = profile?.subscriptions?.[0];
  const isSubscribed = activeSubscription?.status === 'ACTIVE' && new Date(activeSubscription.endDate) > new Date();

  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>({
    defaultValues: {
      licenseNumber: profile?.licenseNumber || '',
      specialty: profile?.specialty || '',
      officeName: profile?.officeName || '',
      officeAddress: profile?.officeAddress || '',
      phone: profile?.phone || '',
      website: profile?.website || '',
      bio: profile?.bio || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileForm) => surgeonsApi.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surgeon-profile'] });
      setIsEditingProfile(false);
      setSuccess('Profile updated successfully');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Update failed');
      }
    },
  });

  const subscribeMutation = useMutation({
    mutationFn: (tierId: string) => surgeonsApi.subscribe(tierId),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['surgeon-profile'] });
      setSuccess(res.data.message || 'Subscription activated!');
      setTimeout(() => setSuccess(''), 4000);
    },
    onError: (err) => {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.error || 'Subscription failed');
      }
    },
  });

  const signAgreementMutation = useMutation({
    mutationFn: (listingId: string) => surgeonsApi.signAgreement(listingId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['surgeon-listings'] });
      setSuccess('Agreement signed!');
      setTimeout(() => setSuccess(''), 3000);
    },
  });

  const statusColors: Record<string, string> = {
    ACTIVE: 'badge-active',
    FUNDED: 'badge-funded',
    COMPLETED: 'badge-completed',
    EXPIRED: 'badge-expired',
    DRAFT: 'badge-draft',
    CANCELLED: 'badge-cancelled',
  };

  if (profileLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Surgeon Dashboard
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Dr. {user?.profile?.fullName || user?.email}
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <p className="text-sm text-green-700">{success}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile & Subscription */}
          <div className="space-y-4">
            {/* Subscription status */}
            <div className={`card p-6 ${isSubscribed ? 'border-l-4 border-l-primary-500' : ''}`}>
              <div className="flex items-center gap-2 mb-3">
                <Star className={`w-5 h-5 ${isSubscribed ? 'text-primary-500 fill-current' : 'text-gray-300'}`} />
                <h2 className="font-semibold text-gray-900">Subscription Status</h2>
              </div>

              {isSubscribed && activeSubscription ? (
                <div>
                  <p className="text-sm text-green-600 font-medium flex items-center gap-1 mb-2">
                    <CheckCircle className="w-4 h-4" />
                    Active: {activeSubscription.tier?.name}
                  </p>
                  <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Expires {format(new Date(activeSubscription.endDate), 'MMM d, yyyy')}
                  </p>
                  <p className="text-xs text-primary-600 mt-2">
                    Your profile appears in patient suggestions!
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500 mb-3">
                    Subscribe to appear as a suggested surgeon to patients seeking your specialty.
                  </p>
                  <div className="space-y-2">
                    {tiers.map((tier) => {
                      const features = (() => {
                        try { return JSON.parse(tier.features) as string[]; }
                        catch { return []; }
                      })();
                      return (
                        <div key={tier.id} className="p-3 border border-gray-200 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{tier.name}</span>
                            <span className="text-primary-600 font-bold">${tier.price}/mo</span>
                          </div>
                          <ul className="text-xs text-gray-500 space-y-0.5 mb-2">
                            {features.slice(0, 2).map((f, i) => (
                              <li key={i} className="flex items-center gap-1">
                                <CheckCircle className="w-3 h-3 text-green-400" />
                                {f}
                              </li>
                            ))}
                          </ul>
                          <button
                            onClick={() => subscribeMutation.mutate(tier.id)}
                            disabled={subscribeMutation.isPending}
                            className="btn-primary text-xs py-1.5 w-full"
                          >
                            {subscribeMutation.isPending ? 'Subscribing...' : `Subscribe - $${tier.price}/mo`}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Profile card */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900">Practice Profile</h2>
                <button
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                >
                  {isEditingProfile ? <XCircle className="w-3 h-3" /> : <Edit2 className="w-3 h-3" />}
                  {isEditingProfile ? 'Cancel' : 'Edit'}
                </button>
              </div>

              {isEditingProfile ? (
                <form onSubmit={handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-3">
                  {[
                    { name: 'licenseNumber' as const, label: 'License #', placeholder: 'License number' },
                    { name: 'specialty' as const, label: 'Specialty', placeholder: 'e.g., Rhinoplasty' },
                    { name: 'officeName' as const, label: 'Office Name', placeholder: 'Practice name' },
                    { name: 'officeAddress' as const, label: 'Address', placeholder: 'Office address' },
                    { name: 'phone' as const, label: 'Phone', placeholder: '+1 (555) 000-0000' },
                    { name: 'website' as const, label: 'Website', placeholder: 'https://...' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="form-label text-xs">{field.label}</label>
                      <input className="input-field text-sm" placeholder={field.placeholder} {...register(field.name)} />
                    </div>
                  ))}
                  <div>
                    <label className="form-label text-xs">Bio</label>
                    <textarea rows={3} className="input-field text-sm resize-none" placeholder="About your practice..." {...register('bio')} />
                  </div>
                  <button type="submit" disabled={updateProfileMutation.isPending} className="btn-primary text-sm w-full flex items-center justify-center gap-1">
                    <Save className="w-3 h-3" />
                    {updateProfileMutation.isPending ? 'Saving...' : 'Save Profile'}
                  </button>
                </form>
              ) : profile ? (
                <div className="space-y-2 text-sm">
                  {profile.specialty && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Stethoscope className="w-4 h-4 text-gray-400" />
                      {profile.specialty}
                    </div>
                  )}
                  {profile.officeName && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Building className="w-4 h-4 text-gray-400" />
                      {profile.officeName}
                    </div>
                  )}
                  {profile.phone && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4 text-gray-400" />
                      {profile.phone}
                    </div>
                  )}
                  {profile.website && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline truncate">
                        {profile.website}
                      </a>
                    </div>
                  )}
                  {profile.bio && (
                    <p className="text-gray-500 text-xs mt-2">{profile.bio}</p>
                  )}
                  {!profile.specialty && !profile.officeName && !profile.phone && (
                    <p className="text-gray-400 text-sm">No profile details yet. Click Edit to add your information.</p>
                  )}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">No profile found. Click Edit to create one.</p>
              )}
            </div>
          </div>

          {/* Listings requiring attention */}
          <div className="lg:col-span-2">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Listings Mentioning You ({listings.length})
              </h2>

              {listings.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Stethoscope className="w-12 h-12 mx-auto mb-3 opacity-30" />
                  <p className="font-medium">No listings yet</p>
                  <p className="text-sm mt-1">Listings that mention your name or office will appear here.</p>
                  {!isSubscribed && (
                    <p className="text-sm text-primary-600 mt-2">
                      Subscribe to appear as a suggestion to patients!
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map((listing) => {
                    const needsSurgeonSignature = listing.agreement &&
                      !listing.agreement.surgeonSignedAt;

                    return (
                      <div key={listing.id} className="p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-medium text-gray-900">{listing.title}</h3>
                              <span className={statusColors[listing.status]}>{listing.status}</span>
                            </div>
                            <p className="text-sm text-gray-500">
                              Patient: {listing.patient?.profile?.fullName} • {listing.surgeryType?.name}
                            </p>
                          </div>
                          <div className="text-right text-sm">
                            <p className="font-semibold text-gray-900">${listing.totalGoal.toLocaleString()}</p>
                            <p className="text-xs text-gray-400">goal</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span>Deadline: {format(new Date(listing.deadline), 'MMM d, yyyy')}</span>
                          <span>{listing.contributions?.length ?? 0} contributors</span>
                        </div>

                        {/* Agreement section */}
                        {listing.agreement && (
                          <div className={`p-3 rounded-lg border ${
                            listing.agreement.status === 'FULLY_SIGNED'
                              ? 'bg-green-50 border-green-200'
                              : 'bg-amber-50 border-amber-200'
                          }`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <FileSignature className={`w-4 h-4 ${listing.agreement.status === 'FULLY_SIGNED' ? 'text-green-600' : 'text-amber-600'}`} />
                                <div>
                                  <p className={`text-sm font-medium ${listing.agreement.status === 'FULLY_SIGNED' ? 'text-green-800' : 'text-amber-800'}`}>
                                    {listing.agreement.status === 'FULLY_SIGNED' ? 'Agreement signed' : 'Agreement requires your signature'}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Patient: {listing.agreement.patientSignedAt ? '✓ Signed' : '⏳ Pending'}
                                    {' • '}
                                    Surgeon: {listing.agreement.surgeonSignedAt ? '✓ Signed' : '⏳ Pending'}
                                  </p>
                                </div>
                              </div>
                              {needsSurgeonSignature && (
                                <button
                                  onClick={() => signAgreementMutation.mutate(listing.id)}
                                  disabled={signAgreementMutation.isPending}
                                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3 rounded-lg flex-shrink-0"
                                >
                                  {signAgreementMutation.isPending ? 'Signing...' : 'Sign Agreement'}
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
