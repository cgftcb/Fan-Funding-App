import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, Heart } from 'lucide-react';
import Layout from '../components/Layout';
import ListingCard from '../components/ListingCard';
import { listingsApi, adminApi } from '../api/client';
import { Listing, SurgeryType } from '../types';

export default function Listings() {
  const [search, setSearch] = useState('');
  const [selectedSurgeryType, setSelectedSurgeryType] = useState('');
  const [page, setPage] = useState(1);

  const { data: listingsData, isLoading } = useQuery({
    queryKey: ['listings', { search, selectedSurgeryType, page }],
    queryFn: () =>
      listingsApi.getAll({
        page,
        limit: 12,
        search: search || undefined,
        surgeryTypeId: selectedSurgeryType || undefined,
      }),
    select: (res) => res.data,
  });

  const { data: surgeryTypesData } = useQuery({
    queryKey: ['surgery-types-public'],
    queryFn: () => adminApi.getSurgeryTypes(),
    select: (res) => res.data,
  });

  const listings: Listing[] = listingsData?.listings ?? [];
  const pagination = listingsData?.pagination;
  const surgeryTypes: SurgeryType[] = surgeryTypesData?.surgeryTypes?.filter((s: SurgeryType) => s.isActive) ?? [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Browse Listings</h1>
          <p className="text-gray-500 mt-2">Support someone's transformation journey</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search listings..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="input-field pl-9"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedSurgeryType}
              onChange={(e) => { setSelectedSurgeryType(e.target.value); setPage(1); }}
              className="input-field pl-9 pr-8 min-w-[200px]"
            >
              <option value="">All Surgery Types</option>
              {surgeryTypes.map((type) => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-48 bg-gray-200" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                  <div className="h-2 bg-gray-200 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex justify-center gap-2 mt-8">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
                >
                  Previous
                </button>
                <span className="flex items-center px-4 text-sm text-gray-600">
                  Page {page} of {pagination.pages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                  disabled={page === pagination.pages}
                  className="btn-secondary text-sm px-4 py-2 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-20 text-gray-400">
            <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="text-xl font-medium text-gray-500">No listings found</p>
            <p className="text-sm mt-2">
              {search || selectedSurgeryType
                ? 'Try adjusting your filters'
                : 'Be the first to create a listing!'}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}
