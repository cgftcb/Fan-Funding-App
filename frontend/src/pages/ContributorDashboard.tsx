import React from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  DollarSign,
  Camera,
  Lock,
  CheckCircle,
  TrendingUp,
  Heart,
  Clock,
  ArrowRight,
} from 'lucide-react';
import Layout from '../components/Layout';
import { contributionsApi } from '../api/client';
import { Contribution } from '../types';
import { useAuth } from '../context/AuthContext';
import { format } from 'date-fns';

export default function ContributorDashboard() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['my-contributions'],
    queryFn: () => contributionsApi.getMy(),
    select: (res) => res.data,
  });

  const contributions: Contribution[] = data?.contributions ?? [];

  const stats = {
    total: contributions.length,
    totalAmount: contributions
      .filter(c => c.status === 'CONFIRMED')
      .reduce((sum, c) => sum + c.amount, 0),
    withPhotoAccess: contributions.filter(c => c.qualifiesForPhotos && c.status === 'CONFIRMED').length,
    refunded: contributions.filter(c => c.status === 'REFUNDED').length,
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
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Welcome, {user?.profile?.fullName || 'Contributor'}!
            </h1>
            <p className="text-gray-500 text-sm mt-1">Your contribution portfolio</p>
          </div>
          <Link to="/listings" className="btn-primary flex items-center gap-2">
            <Heart className="w-4 h-4" />
            Find Listings
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Contributions', value: stats.total, icon: <DollarSign className="w-4 h-4" />, color: 'text-blue-600' },
            { label: 'Total Contributed', value: `$${stats.totalAmount.toFixed(2)}`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-600' },
            { label: 'Photo Access', value: stats.withPhotoAccess, icon: <Camera className="w-4 h-4" />, color: 'text-primary-600' },
            { label: 'Refunded', value: stats.refunded, icon: <CheckCircle className="w-4 h-4" />, color: 'text-gray-500' },
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

        {/* Contributions list */}
        {contributions.length === 0 ? (
          <div className="card p-12 text-center">
            <Heart className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No contributions yet</h2>
            <p className="text-gray-500 mb-6">
              Browse listings and support someone's surgery journey. Qualifying contributions get exclusive before & after photo access.
            </p>
            <Link to="/listings" className="btn-primary inline-flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Browse Listings
            </Link>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Contributions</h2>
            <div className="space-y-4">
              {contributions.map((contribution) => {
                const listing = contribution.listing;
                if (!listing) return null;

                const escrowAmount = listing.escrow?.totalAmount ?? 0;
                const progress = Math.min((escrowAmount / listing.totalGoal) * 100, 100);
                const statusColors: Record<string, string> = {
                  ACTIVE: 'badge-active',
                  FUNDED: 'badge-funded',
                  COMPLETED: 'badge-completed',
                  EXPIRED: 'badge-expired',
                  DRAFT: 'badge-draft',
                  CANCELLED: 'badge-cancelled',
                };

                return (
                  <div key={contribution.id} className="card p-5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-base font-semibold text-gray-900 truncate">
                            {listing.title}
                          </h3>
                          <span className={statusColors[listing.status] || 'badge-draft'}>
                            {listing.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500 mb-1">
                          {listing.surgeryType?.name} • {listing.patient?.profile?.fullName}
                        </p>
                        <p className="text-xs text-gray-400">
                          Contributed {format(new Date(contribution.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right ml-4 flex-shrink-0">
                        <p className="text-lg font-bold text-gray-900">${contribution.amount.toFixed(2)}</p>
                        <span className={`badge text-xs ${
                          contribution.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                          contribution.status === 'REFUNDED' ? 'bg-gray-100 text-gray-600' :
                          'bg-yellow-100 text-yellow-700'
                        }`}>
                          {contribution.status}
                        </span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-3 mb-3">
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>${escrowAmount.toFixed(0)} raised</span>
                        <span>Goal: ${listing.totalGoal.toFixed(0)}</span>
                      </div>
                      <div className="progress-bar">
                        <div className="progress-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    {/* Photo access indicator */}
                    <div className="flex items-center justify-between">
                      <div>
                        {contribution.qualifiesForPhotos && contribution.status === 'CONFIRMED' ? (
                          <span className="flex items-center gap-1.5 text-sm text-green-600">
                            <Camera className="w-4 h-4" />
                            <span>You have photo access</span>
                          </span>
                        ) : contribution.status === 'CONFIRMED' && listing.minContributionForPhotos > 0 ? (
                          <span className="flex items-center gap-1.5 text-sm text-gray-400">
                            <Lock className="w-4 h-4" />
                            <span>
                              Contribute ${(listing.minContributionForPhotos - contribution.amount).toFixed(2)} more for photos
                            </span>
                          </span>
                        ) : contribution.status === 'REFUNDED' ? (
                          <span className="flex items-center gap-1.5 text-sm text-gray-400">
                            <CheckCircle className="w-4 h-4" />
                            <span>Refunded</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 text-sm text-green-600">
                            <Camera className="w-4 h-4" />
                            <span>Photo access included</span>
                          </span>
                        )}
                      </div>
                      <Link
                        to={`/listings/${listing.id}`}
                        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
                      >
                        View listing <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
