"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';

// ゲームの主要なコンポーネント
const PingPongGame = () => {
  // Canvas要素への参照
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ゲームの状態管理
  const [score, setScore] = useState({ player: 0, ai: 0 });
  // ゲームループ内の古いクロージャからでも最新のスコアにアクセスするためのref
  const scoreRef = useRef(score);
  useEffect(() => {
    scoreRef.current = score;
  }, [score]);

  const [gameState, setGameState] = useState<'start' | 'playing' | 'gameOver'>('start'); // 'start', 'playing', 'gameOver'

  // ゲームの定数
  const PADDLE_HEIGHT = 100;
  const PADDLE_WIDTH = 12;
  const BALL_RADIUS = 10;

  // ゲーム要素の位置や速度を保持するための参照
  const gameElements = useRef({
    ballX: 0,
    ballY: 0,
    ballSpeedX: 0,
    ballSpeedY: 0,
    playerY: 0,
    aiY: 0,
  });

  // Canvasの初期化とリサイズ処理
  const initializeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      console.error("Canvas element not found.");
      return { canvas: null, context: null };
    }
    const context = canvas.getContext('2d');
    if (!context) {
      console.error("2D context not available.");
      return { canvas, context: null };
    }
    const { width, height } = canvas.getBoundingClientRect();
    canvas.width = width;
    canvas.height = height;

    // ゲーム要素の初期位置を設定
    gameElements.current.ballX = canvas.width / 2;
    gameElements.current.ballY = canvas.height / 2;
    gameElements.current.playerY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    gameElements.current.aiY = canvas.height / 2 - PADDLE_HEIGHT / 2;

    return { canvas, context };
  }, []);

  // ゲームをリセットする関数
  const resetGame = useCallback((canvas: HTMLCanvasElement) => {
    gameElements.current.ballX = canvas.width / 2;
    gameElements.current.ballY = canvas.height / 2;
    // ランダムな方向にボールを発射
    let side = Math.random() > 0.5 ? 1 : -1;
    gameElements.current.ballSpeedX = 5 * side;
    gameElements.current.ballSpeedY = Math.random() * 6 - 3;
  }, []);

  // ゲームのメインループ
  useEffect(() => {
    const { canvas, context } = initializeCanvas();
    if (!canvas || !context) return;

    let animationFrameId: number;

    // ゲームループ関数
    const gameLoop = () => {
      // ゲームがプレイ中でなければループを停止
      if (gameState !== 'playing') {
        drawStartOrGameOver(context, canvas);
        return;
      }

      // ゲームの状態を更新
      update(canvas);
      // 描画
      draw(context, canvas);

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    // ゲーム状態が 'playing' になったらループを開始
    if (gameState === 'playing') {
      resetGame(canvas);
      gameLoop();
    } else {
      drawStartOrGameOver(context, canvas);
    }

    // ウィンドウリサイズ時にCanvasを再初期化
    const handleResize = () => {
      initializeCanvas();
      if (gameState !== 'playing') {
        drawStartOrGameOver(context, canvas);
      }
    };
    window.addEventListener('resize', handleResize);

    // クリーンアップ関数
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
    };
  }, [gameState, initializeCanvas, resetGame]);

  // プレイヤーのパドル操作
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      // マウスの位置に合わせてプレイヤーのパドルを動かす
      let newPlayerY = e.clientY - rect.top - PADDLE_HEIGHT / 2;

      // パドルがCanvasからはみ出ないように制限
      if (newPlayerY < 0) newPlayerY = 0;
      if (newPlayerY > canvas.height - PADDLE_HEIGHT) newPlayerY = canvas.height - PADDLE_HEIGHT;

      gameElements.current.playerY = newPlayerY;
    };

    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);


  // ゲームロジックの更新
  const update = (canvas: HTMLCanvasElement) => {
    const { current: el } = gameElements;

    // ボールの移動
    el.ballX += el.ballSpeedX;
    el.ballY += el.ballSpeedY;

    // AIパドルの移動ロジック
    // ボールを追いかけるように動かす (少し遅延させて難易度調整)
    const aiCenter = el.aiY + PADDLE_HEIGHT / 2;
    if (aiCenter < el.ballY - 35) {
      el.aiY += 5;
    } else if (aiCenter > el.ballY + 35) {
      el.aiY -= 5;
    }

    // AIパドルがCanvasからはみ出ないように制限
    if (el.aiY < 0) el.aiY = 0;
    if (el.aiY > canvas.height - PADDLE_HEIGHT) el.aiY = canvas.height - PADDLE_HEIGHT;

    // 衝突判定: 上下の壁
    if (el.ballY - BALL_RADIUS < 0 || el.ballY + BALL_RADIUS > canvas.height) {
      el.ballSpeedY = -el.ballSpeedY;
    }

    // 衝突判定: パドル
    // プレイヤーパドル
    if (el.ballX - BALL_RADIUS < PADDLE_WIDTH &&
      el.ballY > el.playerY &&
      el.ballY < el.playerY + PADDLE_HEIGHT) {
      el.ballSpeedX = -el.ballSpeedX;
      // パドルに当たった位置で跳ね返る角度を変える
      let deltaY = el.ballY - (el.playerY + PADDLE_HEIGHT / 2);
      el.ballSpeedY = deltaY * 0.2;
    }

    // AIパドル
    if (el.ballX + BALL_RADIUS > canvas.width - PADDLE_WIDTH &&
      el.ballY > el.aiY &&
      el.ballY < el.aiY + PADDLE_HEIGHT) {
      el.ballSpeedX = -el.ballSpeedX;
      let deltaY = el.ballY - (el.aiY + PADDLE_HEIGHT / 2);
      el.ballSpeedY = deltaY * 0.2;
    }

    // 得点判定
    if (el.ballX < 0) {
      setScore(s => ({ ...s, ai: s.ai + 1 }));
      resetGame(canvas);
    } else if (el.ballX > canvas.width) {
      setScore(s => ({ ...s, player: s.player + 1 }));
      resetGame(canvas);
    }

    // ゲームオーバー判定
    // stateのscoreはゲームループのクロージャ内では古いため、refを使用して最新の値を参照します
    if (scoreRef.current.player >= 5 || scoreRef.current.ai >= 5) {
      setGameState('gameOver');
    }
  };

  // 描画処理
  const draw = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    const { current: el } = gameElements;

    // 背景
    context.fillStyle = '#1a202c'; // dark gray
    context.fillRect(0, 0, canvas.width, canvas.height);

    // センターライン
    context.strokeStyle = '#4a5568'; // gray
    context.lineWidth = 4;
    context.setLineDash([10, 10]);
    context.beginPath();
    context.moveTo(canvas.width / 2, 0);
    context.lineTo(canvas.width / 2, canvas.height);
    context.stroke();
    context.setLineDash([]);


    // プレイヤーパドル
    context.fillStyle = '#4299e1'; // blue
    context.fillRect(0, el.playerY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // AIパドル
    context.fillStyle = '#f56565'; // red
    context.fillRect(canvas.width - PADDLE_WIDTH, el.aiY, PADDLE_WIDTH, PADDLE_HEIGHT);

    // ボール
    context.fillStyle = '#f7fafc'; // white
    context.beginPath();
    context.arc(el.ballX, el.ballY, BALL_RADIUS, 0, Math.PI * 2);
    context.fill();

    // スコア表示
    context.font = '48px "Segoe UI", sans-serif';
    context.textAlign = 'center';
    context.fillStyle = '#e2e8f0'; // light gray
    // 修正点: scoreRef を使用して最新のスコアを描画します
    context.fillText(scoreRef.current.player.toString(), canvas.width / 2 - 60, 50);
    context.fillText(scoreRef.current.ai.toString(), canvas.width / 2 + 60, 50);
  };

  // ゲーム開始前/終了後の画面描画
  const drawStartOrGameOver = (context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => {
    context.fillStyle = 'rgba(26, 32, 44, 0.9)';
    context.fillRect(0, 0, canvas.width, canvas.height);

    context.fillStyle = '#f7fafc';
    context.textAlign = 'center';

    if (gameState === 'start') {
      context.font = '40px "Segoe UI", sans-serif';
      context.fillText('ピンポンゲーム', canvas.width / 2, canvas.height / 2 - 40);
      context.font = '24px "Segoe UI", sans-serif';
      context.fillText('クリックして開始', canvas.width / 2, canvas.height / 2 + 20);
    } else if (gameState === 'gameOver') {
      context.font = '40px "Segoe UI", sans-serif';
      const winner = score.player >= 5 ? 'プレイヤーの勝利！' : 'AIの勝利！';
      context.fillText('ゲームオーバー', canvas.width / 2, canvas.height / 2 - 60);
      context.fillText(winner, canvas.width / 2, canvas.height / 2);
      context.font = '24px "Segoe UI", sans-serif';
      context.fillText('クリックしてリスタート', canvas.width / 2, canvas.height / 2 + 60);
    }
  };

  const handleCanvasClick = () => {
    if (gameState === 'start') {
      setScore({ player: 0, ai: 0 });
      setGameState('playing');
    } else if (gameState === 'gameOver') {
      setScore({ player: 0, ai: 0 });
      setGameState('start');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 font-sans">
      <h1 className="text-4xl font-bold mb-4">AI対戦ピンポン</h1>
      <div className="w-full max-w-4xl aspect-video bg-gray-800 rounded-lg shadow-2xl overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-full cursor-none"
          onClick={handleCanvasClick}
        />
      </div>
      <p className="mt-4 text-gray-400">マウスを動かしてパドルを操作します。5点先取で勝利です。</p>
    </div>
  );
};

export default PingPongGame;
