import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Calendar,
  Users,
  DollarSign,
  Clock,
  Camera,
  Lock,
  CheckCircle,
  AlertCircle,
  Building,
  Phone,
  User,
  Shield,
  FileSignature,
  ChevronLeft,
} from 'lucide-react';
import Layout from '../components/Layout';
import ContributionForm from '../components/ContributionForm';
import SecureImage from '../components/SecureImage';
import { listingsApi, picturesApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { format, isPast, formatDistanceToNow } from 'date-fns';
import { Listing, Picture } from '../types';

const statusColors: Record<string, string> = {
  DRAFT: 'badge-draft',
  ACTIVE: 'badge-active',
  FUNDED: 'badge-funded',
  COMPLETED: 'badge-completed',
  EXPIRED: 'badge-expired',
  CANCELLED: 'badge-cancelled',
};

export default function ListingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'photos' | 'contributors'>('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['listing', id],
    queryFn: () => listingsApi.getById(id!),
    select: (res) => res.data as Listing,
    enabled: !!id,
  });

  const { data: picturesData } = useQuery({
    queryKey: ['listing-pictures', id],
    queryFn: () => picturesApi.getForListing(id!),
    select: (res) => res.data,
    enabled: !!id,
  });

  const listing = data;
  const pictures: Picture[] = picturesData?.pictures ?? [];
  const beforePictures = pictures.filter(p => p.phase === 'BEFORE');
  const afterPictures = pictures.filter(p => p.phase === 'AFTER');

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-64">
          <div className="w-8 h-8 border-3 border-primary-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </Layout>
    );
  }

  if (error || !listing) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Listing not found</h2>
          <Link to="/listings" className="btn-primary inline-block mt-4">Browse Listings</Link>
        </div>
      </Layout>
    );
  }

  const escrowAmount = listing.escrow?.totalAmount ?? 0;
  const progress = Math.min((escrowAmount / listing.totalGoal) * 100, 100);
  const isExpired = isPast(new Date(listing.deadline));
  const isOwner = user?.userId === listing.patientId || user?.id === listing.patientId;
  const canContribute = listing.status === 'ACTIVE' && !isExpired && user?.role === 'CONTRIBUTOR';

  // Determine if current user qualifies for photos
  const userContribution = listing.contributions?.find(
    c => c.contributorId === user?.id
  );
  const userQualifiesForPhotos =
    isOwner ||
    user?.role === 'ADMIN' ||
    (userContribution?.qualifiesForPhotos && userContribution.status === 'CONFIRMED');

  const timeLeft = isExpired
    ? `Ended ${formatDistanceToNow(new Date(listing.deadline))} ago`
    : `${formatDistanceToNow(new Date(listing.deadline))} remaining`;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back */}
        <Link to="/listings" className="flex items-center gap-1 text-gray-500 hover:text-gray-700 text-sm mb-6">
          <ChevronLeft className="w-4 h-4" />
          Back to listings
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Header */}
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={statusColors[listing.status]}>{listing.status}</span>
                    {listing.surgeryType && (
                      <span className="badge bg-gray-100 text-gray-700">{listing.surgeryType.name}</span>
                    )}
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
                  <div className="flex items-center gap-2 mt-2 text-sm text-gray-500">
                    <User className="w-4 h-4" />
                    <span>by {listing.patient?.profile?.fullName || listing.patient?.email}</span>
                    <span>•</span>
                    <span>Posted {format(new Date(listing.createdAt), 'MMM d, yyyy')}</span>
                  </div>
                </div>
              </div>

              {listing.description && (
                <p className="text-gray-600 leading-relaxed">{listing.description}</p>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
              {(['overview', 'photos', 'contributors'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-3 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                  {tab === 'photos' && ` (${beforePictures.length + afterPictures.length})`}
                  {tab === 'contributors' && ` (${listing.contributions?.length ?? 0})`}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {activeTab === 'overview' && (
              <div className="space-y-4">
                {/* Surgeon info */}
                {(listing.surgeonName || listing.surgeonOffice || listing.surgeonContact) && (
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Surgeon Information</h2>
                    <div className="space-y-2">
                      {listing.surgeonName && (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{listing.surgeonName}</span>
                        </div>
                      )}
                      {listing.surgeonOffice && (
                        <div className="flex items-center gap-2 text-sm">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{listing.surgeonOffice}</span>
                        </div>
                      )}
                      {listing.surgeonContact && (
                        <div className="flex items-center gap-2 text-sm">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{listing.surgeonContact}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Agreement status */}
                {listing.agreement && (
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Agreement Status</h2>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-600">
                          <FileSignature className="w-4 h-4" />
                          Patient Signature
                        </span>
                        {listing.agreement.patientSignedAt ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Signed {format(new Date(listing.agreement.patientSignedAt), 'MMM d')}
                          </span>
                        ) : (
                          <span className="text-amber-500">Pending</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2 text-gray-600">
                          <FileSignature className="w-4 h-4" />
                          Surgeon Signature
                        </span>
                        {listing.agreement.surgeonSignedAt ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle className="w-4 h-4" />
                            Signed {format(new Date(listing.agreement.surgeonSignedAt), 'MMM d')}
                          </span>
                        ) : (
                          <span className="text-amber-500">Pending</span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Escrow info */}
                {(isOwner || user?.role === 'ADMIN') && listing.escrow && (
                  <div className="card p-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Escrow Details</h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Escrow Balance</span>
                        <span className="font-medium">${listing.escrow.totalAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status</span>
                        <span className={`badge ${
                          listing.escrow.status === 'HOLDING' ? 'bg-blue-100 text-blue-800' :
                          listing.escrow.status === 'PAID_TO_SURGEON' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>{listing.escrow.status}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Insurance info */}
                <div className="card p-4 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-2">
                    <Shield className="w-4 h-4 text-amber-600 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800">Secure Escrow Protection</p>
                      <p className="text-amber-600 mt-0.5">
                        All contributions are held securely. If the goal isn't met by {format(new Date(listing.deadline), 'MMM d, yyyy')},
                        all contributors receive a full refund automatically.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'photos' && (
              <div className="space-y-6">
                {/* Before photos */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Before Photos</h2>
                  {beforePictures.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {beforePictures.map((pic) => (
                        <div key={pic.id} className="aspect-square rounded-lg overflow-hidden">
                          <SecureImage
                            src={`/api/pictures/${pic.id}/view`}
                            alt="Before photo"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">No before photos yet</p>
                    </div>
                  )}
                </div>

                {/* After photos */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">After Photos</h2>
                    {listing.minContributionForPhotos > 0 && !userQualifiesForPhotos && (
                      <span className="badge bg-primary-100 text-primary-700 flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        Requires ${listing.minContributionForPhotos}+
                      </span>
                    )}
                  </div>

                  {afterPictures.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {afterPictures.map((pic) => (
                        <div key={pic.id} className="aspect-square rounded-lg overflow-hidden">
                          {userQualifiesForPhotos ? (
                            <SecureImage
                              src={`/api/pictures/${pic.id}/view`}
                              alt="After photo"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <SecureImage
                              src=""
                              alt="After photo"
                              className="w-full h-full"
                              isLocked={true}
                              lockedMessage={`Contribute $${listing.minContributionForPhotos}+ to unlock`}
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  ) : listing.status === 'ACTIVE' || listing.status === 'FUNDED' ? (
                    <div className="text-center py-8 bg-gray-50 rounded-lg">
                      <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">After photos will be uploaded post-surgery</p>
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                      <Lock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 font-medium">After photos not yet available</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'contributors' && (
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {listing.contributions?.length ?? 0} Contributors
                </h2>
                {listing.contributions && listing.contributions.length > 0 ? (
                  <div className="space-y-3">
                    {listing.contributions.map((contribution) => (
                      <div key={contribution.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {contribution.contributor?.profile?.fullName || 'Anonymous'}
                            </p>
                            <p className="text-xs text-gray-400">
                              {format(new Date(contribution.createdAt), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">
                            ${contribution.amount.toFixed(2)}
                          </p>
                          {contribution.qualifiesForPhotos && (
                            <p className="text-xs text-green-600 flex items-center gap-1 justify-end">
                              <Camera className="w-3 h-3" />
                              Photo access
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-400">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p>No contributors yet. Be the first!</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* Progress card */}
            <div className="card p-6">
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-2xl font-bold text-gray-900">${escrowAmount.toLocaleString()}</span>
                </div>
                <p className="text-gray-500 text-sm">raised of ${listing.totalGoal.toLocaleString()} goal</p>
              </div>

              <div className="progress-bar mb-1">
                <div className="progress-fill h-3" style={{ width: `${progress}%` }} />
              </div>
              <p className="text-sm text-gray-500 mb-4">{Math.round(progress)}% funded</p>

              <div className="grid grid-cols-2 gap-3 text-center mb-4">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xl font-bold text-gray-900">{listing.contributions?.length ?? 0}</p>
                  <p className="text-xs text-gray-500">contributors</p>
                </div>
                <div className={`rounded-lg p-3 ${isExpired ? 'bg-red-50' : 'bg-gray-50'}`}>
                  <p className={`text-sm font-bold ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                    {isExpired ? 'Ended' : format(new Date(listing.deadline), 'MMM d')}
                  </p>
                  <p className="text-xs text-gray-500">deadline</p>
                </div>
              </div>

              <div className="text-xs text-gray-400 flex items-center gap-1 mb-4">
                <Clock className="w-3.5 h-3.5" />
                {timeLeft}
              </div>

              {listing.minContributionForPhotos > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-primary-600 bg-primary-50 rounded-lg p-2 mb-4">
                  <Camera className="w-3.5 h-3.5" />
                  <span>Contribute ${listing.minContributionForPhotos}+ for photo access</span>
                </div>
              )}

              {/* Surgeon info summary */}
              {listing.surgeonName && (
                <div className="border-t border-gray-100 pt-4 mt-4 space-y-1 text-xs text-gray-500">
                  <p className="font-medium text-gray-700 text-sm">Surgeon</p>
                  <p>{listing.surgeonName}</p>
                  {listing.surgeonOffice && <p>{listing.surgeonOffice}</p>}
                </div>
              )}
            </div>

            {/* Contribution form */}
            {canContribute && (
              <ContributionForm
                listing={listing}
                onSuccess={() => {
                  queryClient.invalidateQueries({ queryKey: ['listing', id] });
                }}
              />
            )}

            {!canContribute && user?.role !== 'CONTRIBUTOR' && listing.status === 'ACTIVE' && (
              <div className="card p-6 text-center">
                <DollarSign className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {!user
                    ? 'Sign in as a contributor to fund this listing'
                    : user.role === 'PATIENT'
                    ? 'Patients cannot contribute to listings'
                    : 'Contributors can fund this listing'}
                </p>
                {!user && (
                  <Link to="/register?role=CONTRIBUTOR" className="btn-primary text-sm mt-3 inline-block">
                    Become a Contributor
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
