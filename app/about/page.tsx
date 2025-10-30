import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NIKENME+について | サービス概要・使い方',
  description: 'NIKENME+（ニケンメプラス）は大分市の2軒目・バー・スナック探しに特化した無料の空席情報マップサービスです。サービスの詳細、使い方、対応エリアについて説明します。',
};

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-4xl font-bold mb-6">NIKENME+（ニケンメプラス）について</h1>
      
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">サービス概要</h2>
        <p className="mb-4">
          NIKENME+（ニケンメプラス）は、大分県大分市における飲食店の空席情報をリアルタイムで提供するWebアプリケーションです。
          主に2軒目、バー、スナック、居酒屋を探すユーザーを対象としており、地図上で現在空席のある店舗を視覚的に確認できます。
        </p>
        <p className="mb-4">
          ログイン不要で即座に利用可能で、はしご酒や飲み歩きを楽しむ人々に最適なサービスです。
          「今すぐ入れるお店」を簡単に見つけられるため、待ち時間や無駄な移動を減らせます。
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">主な機能</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>リアルタイム空席情報の表示</li>
          <li>地図ベースの店舗検索</li>
          <li>ログイン不要の即時利用</li>
          <li>大分市内のバー・スナック・居酒屋情報</li>
          <li>完全無料で利用可能</li>
          <li>位置情報による近隣店舗表示</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">使い方</h2>
        <ol className="list-decimal list-inside space-y-3">
          <li>https://nikenme.jp にアクセス（ログイン・登録不要）</li>
          <li>位置情報の許可を承認</li>
          <li>地図上で空席のあるお店を確認</li>
          <li>気に入ったお店に向かう</li>
        </ol>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">対応エリア</h2>
        <p>現在は大分県大分市を中心にサービスを提供しています。</p>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">こんな時に便利</h2>
        <ul className="list-disc list-inside space-y-2">
          <li>はしご酒や飲み歩きをする際</li>
          <li>2軒目のお店を探すとき</li>
          <li>予約なしで入れるバーやスナックを探すとき</li>
          <li>大分市内で今すぐ入れる居酒屋を見つけたいとき</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">利用料金</h2>
        <p>完全無料です。ログインも不要で、アクセスするだけですぐに利用できます。</p>
      </section>
    </div>
  );
}
