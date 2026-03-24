import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus,
  Upload,
  Camera,
  DollarSign,
  Clock,
  CheckCircle,
  AlertCircle,
  FileSignature,
  Users,
  TrendingUp,
  Eye,
  Shield,
} from 'lucide-react';
import Layout from '../components/Layout';
import { listingsApi, picturesApi } from '../api/client';
import { Listing } from '../types';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

const statusColors: Record<string, string> = {
  DRAFT: 'badge-draft',
  ACTIVE: 'badge-active',
  FUNDED: 'badge-funded',
  COMPLETED: 'badge-completed',
  EXPIRED: 'badge-expired',
  CANCELLED: 'badge-cancelled',
};

export default function PatientDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingListingId, setUploadingListingId] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<'BEFORE' | 'AFTER'>('BEFORE');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['my-listings'],
    queryFn: () => listingsApi.getMy(),
    select: (res) => res.data,
  });

  const payInsuranceMutation = useMutation({
    mutationFn: (listingId: string) => listingsApi.payInsurance(listingId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });

  const signAgreementMutation = useMutation({
    mutationFn: (listingId: string) =>
      listingsApi.signAgreement(listingId, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: ({ listingId, file, phase }: { listingId: string; file: File; phase: string }) => {
      const formData = new FormData();
      formData.append('picture', file);
      formData.append('phase', phase);
      return picturesApi.upload(listingId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-listings'] });
      setUploadingListingId(null);
    },
  });

  const listings: Listing[] = data?.listings ?? [];

  const stats = {
    total: listings.length,
    active: listings.filter(l => l.status === 'ACTIVE').length,
    funded: listings.filter(l => l.status === 'FUNDED' || l.status === 'COMPLETED').length,
    totalRaised: listings.reduce((sum, l) => sum + (l.escrow?.totalAmount ?? 0), 0),
  };

  const handleFileUpload = (listingId: string, phase: 'BEFORE' | 'AFTER') => {
    setUploadingListingId(listingId);
    setUploadPhase(phase);
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadingListingId) return;
    uploadPhotoMutation.mutate({ listingId: uploadingListingId, file, phase: uploadPhase });
    e.target.value = '';
  };

  if (isLoading) {
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
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user?.profile?.fullName || 'Patient'}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">Manage your surgery funding campaigns</p>
          </div>
          <Link to="/listings/create" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Listing
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Listings', value: stats.total, icon: <Eye className="w-4 h-4" />, color: 'text-blue-600' },
            { label: 'Active', value: stats.active, icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-600' },
            { label: 'Funded', value: stats.funded, icon: <CheckCircle className="w-4 h-4" />, color: 'text-primary-600' },
            { label: 'Total Raised', value: `$${stats.totalRaised.toLocaleString()}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-gold-600' },
          ].map((stat, i) => (
            <div key={i} className="card p-4">
              <div className={`flex items-center gap-2 mb-2 ${stat.color}`}>
                {stat.icon}
                <span className="text-xs font-medium text-gray-500">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-gray-900">{stat.value}</p>
            </div>
          ))}
        </div>

        {/* Listings */}
        {listings.length === 0 ? (
          <div className="card p-12 text-center">
            <Camera className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No listings yet</h2>
            <p className="text-gray-500 mb-6">Create your first listing to start raising funds for your surgery.</p>
            <Link to="/listings/create" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Create First Listing
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {listings.map((listing) => {
              const progress = Math.min(
                ((listing.escrow?.totalAmount ?? 0) / listing.totalGoal) * 100,
                100
              );
              const isDeadlinePast = isPast(new Date(listing.deadline));
              const beforePictures = listing.pictures?.filter(p => p.phase === 'BEFORE') ?? [];
              const afterPictures = listing.pictures?.filter(p => p.phase === 'AFTER') ?? [];
              const canPayInsurance = !listing.insuranceFeePaid && listing.status === 'DRAFT';
              const needsAgreementSign = listing.agreement &&
                listing.agreement.status !== 'FULLY_SIGNED' &&
                !listing.agreement.patientSignedAt;
              const canUploadAfter = ['FUNDED', 'COMPLETED'].includes(listing.status);

              return (
                <div key={listing.id} className="card overflow-hidden">
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h2 className="text-lg font-semibold text-gray-900 truncate">{listing.title}</h2>
                          <span className={statusColors[listing.status]}>{listing.status}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {listing.surgeryType?.name} • Created {format(new Date(listing.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <Link
                        to={`/listings/${listing.id}`}
                        className="btn-secondary text-sm ml-4 flex-shrink-0"
                      >
                        View
                      </Link>
                    </div>

                    {/* Progress */}
                    <div className="mb-4">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">
                          ${(listing.escrow?.totalAmount ?? 0).toLocaleString()} raised
                        </span>
                        <span className="text-gray-500">
                          Goal: ${listing.totalGoal.toLocaleString()}
                        </span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>{Math.round(progress)}% funded</span>
                        <span className={`flex items-center gap-1 ${isDeadlinePast ? 'text-red-400' : ''}`}>
                          <Clock className="w-3 h-3" />
                          {isDeadlinePast
                            ? `Ended ${formatDistanceToNow(new Date(listing.deadline))} ago`
                            : `${formatDistanceToNow(new Date(listing.deadline))} left`}
                        </span>
                      </div>
                    </div>

                    {/* Stats row */}
                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-4">
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {listing.contributions?.length ?? 0} contributors
                      </span>
                      <span className="flex items-center gap-1">
                        <Camera className="w-4 h-4" />
                        {beforePictures.length} before / {afterPictures.length} after photos
                      </span>
                      {listing.surgeonName && (
                        <span className="flex items-center gap-1 truncate">
                          Surgeon: {listing.surgeonName}
                        </span>
                      )}
                    </div>

                    {/* Action alerts */}
                    <div className="space-y-2">
                      {canPayInsurance && (
                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-amber-600" />
                            <div>
                              <p className="text-sm font-medium text-amber-800">Insurance fee required</p>
                              <p className="text-xs text-amber-600">
                                Pay ${listing.insuranceFeeAmount.toFixed(2)} to activate your listing
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => payInsuranceMutation.mutate(listing.id)}
                            disabled={payInsuranceMutation.isPending}
                            className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
                          >
                            {payInsuranceMutation.isPending ? 'Processing...' : 'Pay Fee'}
                          </button>
                        </div>
                      )}

                      {needsAgreementSign && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2">
                            <FileSignature className="w-4 h-4 text-blue-600" />
                            <div>
                              <p className="text-sm font-medium text-blue-800">Agreement needs your signature</p>
                              <p className="text-xs text-blue-600">Sign the digital agreement to proceed</p>
                            </div>
                          </div>
                          <button
                            onClick={() => signAgreementMutation.mutate(listing.id)}
                            disabled={signAgreementMutation.isPending}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 rounded-lg flex-shrink-0"
                          >
                            {signAgreementMutation.isPending ? 'Signing...' : 'Sign'}
                          </button>
                        </div>
                      )}

                      {listing.agreement?.status === 'FULLY_SIGNED' && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle className="w-4 h-4 text-green-600" />
                          <p className="text-sm text-green-700">Agreement fully signed by all parties</p>
                        </div>
                      )}
                    </div>

                    {/* Photo upload section */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-gray-700">Photos</h3>
                        <div className="flex gap-2">
                          {listing.status !== 'EXPIRED' && listing.status !== 'CANCELLED' && (
                            <button
                              onClick={() => handleFileUpload(listing.id, 'BEFORE')}
                              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              Before Photo
                            </button>
                          )}
                          {canUploadAfter && (
                            <button
                              onClick={() => handleFileUpload(listing.id, 'AFTER')}
                              className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                            >
                              <Upload className="w-3 h-3" />
                              After Photo
                            </button>
                          )}
                        </div>
                      </div>
                      {uploadPhotoMutation.isPending && uploadingListingId === listing.id && (
                        <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                          <div className="w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
                          Uploading photo...
                        </p>
                      )}
                      {canUploadAfter && afterPictures.length === 0 && (
                        <p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" />
                          Please upload required after photos to complete your listing
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
