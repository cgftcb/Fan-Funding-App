import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import {
  BarChart3,
  Users,
  List,
  Settings,
  Star,
  Shield,
  Plus,
  Edit2,
  Check,
  X,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Camera,
} from 'lucide-react';
import Layout from '../components/Layout';
import { adminApi } from '../api/client';
import { SurgeryType, SubscriptionTier, Listing, User, DashboardStats } from '../types';
import { format } from 'date-fns';
import axios from 'axios';

type AdminTab = 'overview' | 'surgery-types' | 'tiers' | 'listings' | 'users' | 'insurance';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [editingSurgeryType, setEditingSurgeryType] = useState<string | null>(null);
  const [editingTier, setEditingTier] = useState<string | null>(null);
  const [showCreateSurgeryType, setShowCreateSurgeryType] = useState(false);
  const [showCreateTier, setShowCreateTier] = useState(false);
  const [surgeryFeeOverride, setSurgeryFeeOverride] = useState<{ [id: string]: string }>({});
  const [error, setError] = useState('');
  const queryClient = useQueryClient();

  // Dashboard
  const { data: dashData } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => adminApi.getDashboard(),
    select: (res) => res.data,
    enabled: activeTab === 'overview',
  });

  // Surgery types
  const { data: surgeryTypesData } = useQuery({
    queryKey: ['admin-surgery-types'],
    queryFn: () => adminApi.getSurgeryTypes(),
    select: (res) => res.data,
    enabled: activeTab === 'surgery-types',
  });

  // Tiers
  const { data: tiersData } = useQuery({
    queryKey: ['admin-subscription-tiers'],
    queryFn: () => adminApi.getSubscriptionTiers(),
    select: (res) => res.data,
    enabled: activeTab === 'tiers',
  });

  // Listings
  const { data: listingsData } = useQuery({
    queryKey: ['admin-listings'],
    queryFn: () => adminApi.getAllListings(),
    select: (res) => res.data,
    enabled: activeTab === 'listings',
  });

  // Users
  const { data: usersData } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => adminApi.getAllUsers(),
    select: (res) => res.data,
    enabled: activeTab === 'users',
  });

  const stats: DashboardStats | undefined = dashData?.stats;
  const surgeryTypes: SurgeryType[] = surgeryTypesData?.surgeryTypes ?? [];
  const tiers: SubscriptionTier[] = tiersData?.tiers ?? [];
  const listings: Listing[] = listingsData?.listings ?? [];
  const users: User[] = usersData?.users ?? [];

  // Create surgery type form
  const { register: registerST, handleSubmit: handleSubmitST, reset: resetST } = useForm<{
    name: string; description: string; adminFeePercent: string; isActive: boolean;
  }>();

  // Create tier form
  const { register: registerTier, handleSubmit: handleSubmitTier, reset: resetTier } = useForm<{
    name: string; price: string; durationDays: string; features: string; isActive: boolean;
  }>();

  const createSurgeryTypeMutation = useMutation({
    mutationFn: (data: object) => adminApi.createSurgeryType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surgery-types'] });
      resetST();
      setShowCreateSurgeryType(false);
    },
  });

  const updateSurgeryTypeMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: object }) => adminApi.updateSurgeryType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-surgery-types'] });
      setEditingSurgeryType(null);
    },
  });

  const createTierMutation = useMutation({
    mutationFn: (data: object) => adminApi.createSubscriptionTier(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-tiers'] });
      resetTier();
      setShowCreateTier(false);
    },
  });

  const insuranceClaimMutation = useMutation({
    mutationFn: ({ listingId, reason }: { listingId: string; reason: string }) =>
      adminApi.handleInsuranceClaim(listingId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
    },
  });

  const setAdminFeeMutation = useMutation({
    mutationFn: ({ listingId, percent }: { listingId: string; percent: number }) =>
      adminApi.setListingAdminFee(listingId, percent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-listings'] });
    },
  });

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'surgery-types', label: 'Surgery Types', icon: <Settings className="w-4 h-4" /> },
    { id: 'tiers', label: 'Subscription Tiers', icon: <Star className="w-4 h-4" /> },
    { id: 'listings', label: 'All Listings', icon: <List className="w-4 h-4" /> },
    { id: 'users', label: 'All Users', icon: <Users className="w-4 h-4" /> },
    { id: 'insurance', label: 'Insurance Claims', icon: <Shield className="w-4 h-4" /> },
  ];

  const statusColors: Record<string, string> = {
    ACTIVE: 'badge-active',
    FUNDED: 'badge-funded',
    COMPLETED: 'badge-completed',
    EXPIRED: 'badge-expired',
    DRAFT: 'badge-draft',
    CANCELLED: 'badge-cancelled',
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-100 text-red-700',
    PATIENT: 'bg-primary-100 text-primary-700',
    CONTRIBUTOR: 'bg-blue-100 text-blue-700',
    SURGEON: 'bg-green-100 text-green-700',
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Overview */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {[
                  { label: 'Total Users', value: stats.totalUsers, icon: <Users className="w-4 h-4" />, color: 'text-blue-600' },
                  { label: 'Total Listings', value: stats.totalListings, icon: <List className="w-4 h-4" />, color: 'text-gray-600' },
                  { label: 'Active Listings', value: stats.activeListings, icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-600' },
                  { label: 'Total Raised', value: `$${(stats.totalContributed || 0).toFixed(0)}`, icon: <DollarSign className="w-4 h-4" />, color: 'text-primary-600' },
                  { label: 'In Escrow', value: `$${(stats.totalEscrowHolding || 0).toFixed(0)}`, icon: <Shield className="w-4 h-4" />, color: 'text-amber-600' },
                  { label: 'Pending Agreements', value: stats.pendingAgreements, icon: <AlertTriangle className="w-4 h-4" />, color: 'text-red-600' },
                ].map((stat, i) => (
                  <div key={i} className="card p-4">
                    <div className={`flex items-center gap-1.5 mb-2 ${stat.color}`}>
                      {stat.icon}
                      <span className="text-xs text-gray-500">{stat.label}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900">{stat.value}</p>
                  </div>
                ))}
              </div>
            )}
            {dashData?.recentListings && (
              <div className="card p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Listings</h2>
                <div className="space-y-3">
                  {dashData.recentListings.map((listing: Listing) => (
                    <div key={listing.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{listing.title}</p>
                        <p className="text-xs text-gray-400">{listing.patient?.profile?.fullName} • {listing.surgeryType?.name}</p>
                      </div>
                      <div className="text-right">
                        <span className={statusColors[listing.status] || 'badge-draft'}>{listing.status}</span>
                        <p className="text-xs text-gray-400 mt-1">{format(new Date(listing.createdAt), 'MMM d')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Surgery Types */}
        {activeTab === 'surgery-types' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateSurgeryType(!showCreateSurgeryType)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Surgery Type
              </button>
            </div>

            {showCreateSurgeryType && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">New Surgery Type</h3>
                <form
                  onSubmit={handleSubmitST((data) =>
                    createSurgeryTypeMutation.mutate({
                      name: data.name,
                      description: data.description,
                      adminFeePercent: parseFloat(data.adminFeePercent),
                      isActive: true,
                    })
                  )}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Name *</label>
                      <input className="input-field" {...registerST('name', { required: true })} placeholder="e.g., Rhinoplasty" />
                    </div>
                    <div>
                      <label className="form-label">Admin Fee %</label>
                      <input type="number" step="0.1" className="input-field" defaultValue="10" {...registerST('adminFeePercent')} />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Description</label>
                    <input className="input-field" {...registerST('description')} placeholder="Brief description" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={createSurgeryTypeMutation.isPending} className="btn-primary text-sm">
                      {createSurgeryTypeMutation.isPending ? 'Creating...' : 'Create'}
                    </button>
                    <button type="button" onClick={() => setShowCreateSurgeryType(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="space-y-3">
              {surgeryTypes.map((type) => (
                <div key={type.id} className="card p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900">{type.name}</h3>
                        <span className={`badge ${type.isActive ? 'badge-active' : 'badge-expired'}`}>
                          {type.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{type.description}</p>
                      <p className="text-xs text-gray-400 mt-1">Admin fee: {type.adminFeePercent}%</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingSurgeryType(editingSurgeryType === type.id ? null : type.id)}
                        className="btn-secondary text-xs py-1.5 px-3"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => updateSurgeryTypeMutation.mutate({ id: type.id, data: { isActive: !type.isActive } })}
                        className={`text-xs py-1.5 px-3 rounded-lg ${type.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                      >
                        {type.isActive ? 'Disable' : 'Enable'}
                      </button>
                    </div>
                  </div>
                  {editingSurgeryType === type.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex gap-3 items-end">
                        <div>
                          <label className="form-label">Admin Fee %</label>
                          <input
                            type="number"
                            step="0.1"
                            defaultValue={type.adminFeePercent}
                            className="input-field w-28"
                            id={`fee-${type.id}`}
                          />
                        </div>
                        <button
                          onClick={() => {
                            const input = document.getElementById(`fee-${type.id}`) as HTMLInputElement;
                            if (input) {
                              updateSurgeryTypeMutation.mutate({
                                id: type.id,
                                data: { adminFeePercent: parseFloat(input.value) },
                              });
                            }
                          }}
                          className="btn-primary text-sm py-2"
                        >
                          <Check className="w-3 h-3 mr-1 inline" />
                          Save
                        </button>
                        <button onClick={() => setEditingSurgeryType(null)} className="btn-secondary text-sm py-2">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Subscription Tiers */}
        {activeTab === 'tiers' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setShowCreateTier(!showCreateTier)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Tier
              </button>
            </div>

            {showCreateTier && (
              <div className="card p-6">
                <h3 className="font-semibold text-gray-900 mb-4">New Subscription Tier</h3>
                <form
                  onSubmit={handleSubmitTier((data) =>
                    createTierMutation.mutate({
                      name: data.name,
                      price: parseFloat(data.price),
                      durationDays: parseInt(data.durationDays),
                      features: data.features ? data.features.split('\n').filter(Boolean) : [],
                      isActive: true,
                    })
                  )}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="form-label">Name *</label>
                      <input className="input-field" {...registerTier('name', { required: true })} placeholder="e.g., Professional" />
                    </div>
                    <div>
                      <label className="form-label">Price ($/mo)</label>
                      <input type="number" step="0.01" className="input-field" {...registerTier('price')} placeholder="99.99" />
                    </div>
                    <div>
                      <label className="form-label">Duration (days)</label>
                      <input type="number" className="input-field" {...registerTier('durationDays')} defaultValue="30" />
                    </div>
                  </div>
                  <div>
                    <label className="form-label">Features (one per line)</label>
                    <textarea rows={3} className="input-field resize-none" {...registerTier('features')} placeholder="Profile listing&#10;Patient discovery&#10;Analytics" />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" disabled={createTierMutation.isPending} className="btn-primary text-sm">
                      {createTierMutation.isPending ? 'Creating...' : 'Create'}
                    </button>
                    <button type="button" onClick={() => setShowCreateTier(false)} className="btn-secondary text-sm">Cancel</button>
                  </div>
                </form>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {tiers.map((tier) => {
                const features = (() => {
                  try { return JSON.parse(tier.features) as string[]; }
                  catch { return []; }
                })();
                return (
                  <div key={tier.id} className="card p-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-gray-900">{tier.name}</h3>
                        <p className="text-2xl font-bold text-primary-600 mt-1">
                          ${tier.price}<span className="text-sm font-normal text-gray-400">/mo</span>
                        </p>
                      </div>
                      <span className={`badge ${tier.isActive ? 'badge-active' : 'badge-expired'}`}>
                        {tier.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mb-3">{tier.durationDays} days duration</p>
                    <ul className="space-y-1.5 mb-4">
                      {features.map((f, i) => (
                        <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <button
                      onClick={() => adminApi.updateSubscriptionTier(tier.id, { isActive: !tier.isActive })
                        .then(() => queryClient.invalidateQueries({ queryKey: ['admin-subscription-tiers'] }))}
                      className={`text-xs w-full py-1.5 rounded-lg ${tier.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                    >
                      {tier.isActive ? 'Disable' : 'Enable'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Listings */}
        {activeTab === 'listings' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Patient</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Surgery</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Goal</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Admin Fee</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {listings.map((listing) => (
                    <tr key={listing.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900 max-w-[200px] truncate">{listing.title}</p>
                        <p className="text-xs text-gray-400">{format(new Date(listing.createdAt), 'MMM d, yyyy')}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {listing.patient?.profile?.fullName || listing.patient?.email}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{listing.surgeryType?.name}</td>
                      <td className="py-3 px-4 text-sm text-gray-900">${listing.totalGoal.toFixed(0)}</td>
                      <td className="py-3 px-4">
                        <span className={statusColors[listing.status] || 'badge-draft'}>{listing.status}</span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            step="0.1"
                            defaultValue={listing.adminFeePercent}
                            className="input-field py-1 text-xs w-16"
                            onChange={(e) => setSurgeryFeeOverride({ ...surgeryFeeOverride, [listing.id]: e.target.value })}
                          />
                          <button
                            onClick={() => {
                              const val = surgeryFeeOverride[listing.id];
                              if (val) {
                                setAdminFeeMutation.mutate({ listingId: listing.id, percent: parseFloat(val) });
                              }
                            }}
                            className="btn-primary text-xs py-1 px-2"
                          >%</button>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {listing.status === 'FUNDED' && (
                          <button
                            onClick={() => insuranceClaimMutation.mutate({ listingId: listing.id, reason: 'Non-compliance' })}
                            className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1"
                          >
                            <Shield className="w-3 h-3" />
                            Claim
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {listings.length === 0 && (
                <div className="text-center py-12 text-gray-400">No listings found</div>
              )}
            </div>
          </div>
        )}

        {/* All Users */}
        {activeTab === 'users' && (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">User</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Listings</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Contributions</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 uppercase">Joined</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="text-sm font-medium text-gray-900">
                          {user.profile?.fullName || 'No name'}
                        </p>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`badge ${roleColors[user.role] || 'bg-gray-100 text-gray-700'}`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">{user.email}</td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {(user as any)._count?.listings ?? 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-600">
                        {(user as any)._count?.contributions ?? 0}
                      </td>
                      <td className="py-3 px-4 text-sm text-gray-400">
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {users.length === 0 && (
                <div className="text-center py-12 text-gray-400">No users found</div>
              )}
            </div>
          </div>
        )}

        {/* Insurance Claims */}
        {activeTab === 'insurance' && (
          <div className="space-y-4">
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Insurance / Compliance Management</h2>
              <p className="text-sm text-gray-500 mb-6">
                Manage insurance claims for patient non-compliance. When a patient fails to upload required photos,
                the insurance fee can be claimed to cover administrative costs.
              </p>

              <div className="space-y-3">
                {listings
                  .filter(l => l.status === 'FUNDED' || l.status === 'COMPLETED')
                  .map((listing) => {
                    const afterPictures = listing.pictures?.filter(p => p.phase === 'AFTER') ?? [];
                    const isCompliant = afterPictures.length > 0;
                    return (
                      <div key={listing.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{listing.title}</p>
                          <p className="text-xs text-gray-400">
                            {listing.patient?.profile?.fullName} • Insurance: ${listing.insuranceFeeAmount.toFixed(2)}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={statusColors[listing.status]}>{listing.status}</span>
                            {isCompliant ? (
                              <span className="badge badge-active flex items-center gap-1">
                                <Camera className="w-3 h-3" /> Photos uploaded
                              </span>
                            ) : (
                              <span className="badge badge-expired flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> No after photos
                              </span>
                            )}
                          </div>
                        </div>
                        {!isCompliant && listing.insuranceFeeAmount > 0 && (
                          <button
                            onClick={() => insuranceClaimMutation.mutate({ listingId: listing.id, reason: 'Patient failed to upload required after photos' })}
                            disabled={insuranceClaimMutation.isPending}
                            className="btn-danger text-sm"
                          >
                            File Claim
                          </button>
                        )}
                      </div>
                    );
                  })}
                {listings.filter(l => l.status === 'FUNDED' || l.status === 'COMPLETED').length === 0 && (
                  <p className="text-center text-gray-400 py-8">No funded listings to review</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
