import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Star, Stethoscope, Building, Phone, Globe, CheckCircle } from 'lucide-react';
import Layout from '../components/Layout';
import { surgeonsApi } from '../api/client';
import { SurgeonProfile } from '../types';
import { Link } from 'react-router-dom';

export default function SurgeonDirectory() {
  const { data, isLoading } = useQuery({
    queryKey: ['surgeons-suggested'],
    queryFn: () => surgeonsApi.getSuggested(),
    select: (res) => res.data,
  });

  const surgeons: SurgeonProfile[] = data?.surgeons ?? [];

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Find a Surgeon</h1>
          <p className="text-gray-500 mt-2">Browse verified and subscribed cosmetic surgeons on our platform</p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card p-6 animate-pulse">
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-3/4" />
                    <div className="h-3 bg-gray-200 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : surgeons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {surgeons.map((surgeon) => {
              const activeSubscription = surgeon.subscriptions?.[0];
              const tierName = activeSubscription?.tier?.name || '';

              return (
                <div key={surgeon.id} className="card p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-gradient-to-br from-primary-100 to-pink-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-7 h-7 text-primary-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-gray-900">
                        Dr. {surgeon.user?.profile?.fullName || 'Unknown'}
                      </h3>
                      {surgeon.specialty && (
                        <p className="text-sm text-primary-600">{surgeon.specialty}</p>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-3.5 h-3.5 text-gold-400 fill-current" />
                        <span className="text-xs text-gray-500">
                          {tierName ? `${tierName} Member` : 'Verified Pro'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    {surgeon.officeName && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{surgeon.officeName}</span>
                      </div>
                    )}
                    {surgeon.officeAddress && (
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className="text-xs ml-5 truncate">{surgeon.officeAddress}</span>
                      </div>
                    )}
                    {surgeon.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <span>{surgeon.phone}</span>
                      </div>
                    )}
                    {surgeon.website && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Globe className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        <a
                          href={surgeon.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 hover:underline truncate"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {surgeon.website.replace(/^https?:\/\//, '')}
                        </a>
                      </div>
                    )}
                  </div>

                  {surgeon.bio && (
                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{surgeon.bio}</p>
                  )}

                  <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Available for new patients</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Stethoscope className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">No Featured Surgeons Yet</h2>
            <p className="text-gray-500">
              Surgeons who subscribe to our platform appear here.
            </p>
            <div className="mt-6">
              <Link to="/register?role=SURGEON" className="btn-primary inline-block">
                Register as a Surgeon
              </Link>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
