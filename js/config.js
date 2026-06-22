const CONFIG = {
  SUPABASE_URL: 'https://qyzyruevrnfciomzjglm.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_P4ycJtCO-PfbMt6hXvQSyQ_qxZ2Pt_3',
  BARBERS: [
    { id: 'daniel', name: 'Daniel', emoji: '✂️' },
  ],
  WA_NUMBER: '523318745381',
  COOLDOWN_SECONDS: 30,
  ADMIN_PASSWORD: 'S1st3m@s',
};

const SCALE_LABELS = {
  1: 'Terrible',  2: 'Muy malo',   3: 'Malo',    4: 'Regular',
  5: 'Aceptable', 6: 'Bien',       7: 'Muy bien', 8: 'Genial',
  9: 'Excelente', 10: 'Perfecto'
};

const NPS_LABELS = {
  0: 'Definitivamente no',
  1: 'Muy poco probable',
  2: 'Poco probable',
  3: 'Improbable',
  4: 'Algo dudoso',
  5: 'Neutral',
  6: 'Ligeramente probable',
  7: 'Probable',
  8: 'Muy probable',
  9: 'Casi seguro',
  10: '¡Totalmente seguro!'
};
