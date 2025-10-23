'use client';

import { motion } from 'framer-motion';
import { MapPin, Users, TrendingUp, Store, Shield, Zap, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function LandingPage() {
  const features = [
    {
      icon: MapPin,
      title: 'リアルタイム位置情報',
      description: '地図上で近くのお店の混雑状況を一目で確認できます。',
    },
    {
      icon: Users,
      title: '来客情報の可視化',
      description: '男女比や混雑度を見て、最適なお店を選べます。',
    },
    {
      icon: TrendingUp,
      title: '最新の情報共有',
      description: 'ユーザーが投稿する最新の店舗情報をチェック。',
    },
    {
      icon: Store,
      title: '店舗管理機能',
      description: '企業アカウントで店舗情報をリアルタイム更新。',
    },
    {
      icon: Shield,
      title: '安全なデータ管理',
      description: 'Supabaseによる堅牢なセキュリティ。',
    },
    {
      icon: Zap,
      title: '高速なレスポンス',
      description: '最新技術による快適な操作感。',
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-sm border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary">
            <MapPin className="w-8 h-8" />
            <span className="text-2xl font-bold">MachiNow</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">ログイン</Button>
            </Link>
            <Link href="/register">
              <Button>今すぐ始める</Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              いますぐ、2軒目へ
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              飲食店の混雑状況をリアルタイムで共有。
              <br />
              あなたの街の「今」を、みんなで作る。
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" className="text-lg px-8">
                  無料で始める
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/map">
                <Button size="lg" variant="outline" className="text-lg px-8">
                  マップを見る
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative rounded-2xl overflow-hidden shadow-2xl mb-20"
          >
            <div className="aspect-video bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <div className="text-center text-white p-8">
                <MapPin className="w-24 h-24 mx-auto mb-4" />
                <p className="text-2xl font-bold">アプリのデモ画面</p>
                <p className="text-white/80 mt-2">地図上で店舗情報を確認</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">主な機能</h2>
            <p className="text-xl text-muted-foreground">
              MachiNowが提供する充実の機能
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-shadow">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">使い方はとても簡単</h2>
            <p className="text-xl text-muted-foreground">
              3つのステップで今すぐ始められます
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'アカウント登録',
                description: 'メールアドレスで簡単に登録できます。',
              },
              {
                step: '2',
                title: '地図を確認',
                description: '近くのお店の混雑状況をチェック。',
              },
              {
                step: '3',
                title: '情報を共有',
                description: 'あなたの体験を投稿して共有。',
              },
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-16 h-16 rounded-full bg-primary text-white text-2xl font-bold flex items-center justify-center mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 bg-primary text-white">
        <div className="container mx-auto max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl font-bold mb-6">
              今すぐMachiNowを始めましょう
            </h2>
            <p className="text-xl text-white/90 mb-8">
              無料で登録して、あなたの街の「今」を共有しよう
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/register">
                <Button size="lg" variant="secondary" className="text-lg px-8">
                  無料で始める
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="py-12 px-4 border-t">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2 text-primary">
              <MapPin className="w-8 h-8" />
              <span className="text-2xl font-bold">MachiNow</span>
            </div>
            <p className="text-muted-foreground text-center md:text-right">
              © 2025 MachiNow. All rights reserved.
              <br />
              いますぐ、2軒目へ
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
