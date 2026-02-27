import argparse
import json
import math
from datetime import datetime
from pathlib import Path

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import roc_auc_score, confusion_matrix
from sklearn.model_selection import train_test_split


def clamp01(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def load_rows(path: Path):
    with path.open('r', encoding='utf-8') as handle:
        payload = json.load(handle)
    return payload if isinstance(payload, list) else []


def precision_recall_at_k(y_true, y_scores, k=20):
    if len(y_true) == 0:
        return 0.0, 0.0

    indices = np.argsort(y_scores)[::-1]
    top_indices = indices[: min(k, len(indices))]

    true_positives = np.sum(y_true[top_indices] == 1)
    precision = float(true_positives / max(1, len(top_indices)))

    total_positives = np.sum(y_true == 1)
    recall = float(true_positives / max(1, total_positives))
    return precision, recall


def calibration_bins(y_true, y_scores, bins=10):
    if len(y_true) == 0:
        return [], 0.0

    y_true = np.asarray(y_true)
    y_scores = np.asarray(y_scores)

    edges = np.linspace(0, 1, bins + 1)
    rows = []
    ece = 0.0

    for i in range(bins):
        lower = edges[i]
        upper = edges[i + 1]
        if i == bins - 1:
            mask = (y_scores >= lower) & (y_scores <= upper)
        else:
            mask = (y_scores >= lower) & (y_scores < upper)

        count = int(np.sum(mask))
        if count == 0:
            continue

        bucket_true = y_true[mask]
        bucket_scores = y_scores[mask]
        observed = float(np.mean(bucket_true))
        predicted = float(np.mean(bucket_scores))

        weight = count / len(y_true)
        ece += abs(observed - predicted) * weight

        rows.append({
            'binStart': round(float(lower), 4),
            'binEnd': round(float(upper), 4),
            'count': count,
            'observedRate': round(observed, 6),
            'predictedRate': round(predicted, 6),
            'absError': round(abs(observed - predicted), 6),
        })

    return rows, round(float(ece), 6)


def safe_auc(y_true, y_scores):
    classes = np.unique(y_true)
    if len(classes) < 2:
        return 0.5

    try:
        return float(roc_auc_score(y_true, y_scores))
    except Exception:
        return 0.5


def split_dataset(X, y, random_seed):
    stratify = y if len(np.unique(y)) > 1 else None

    X_train, X_temp, y_train, y_temp = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=random_seed,
        stratify=stratify,
    )

    stratify_temp = y_temp if len(np.unique(y_temp)) > 1 else None
    X_validate, X_holdout, y_validate, y_holdout = train_test_split(
        X_temp,
        y_temp,
        test_size=0.5,
        random_state=random_seed,
        stratify=stratify_temp,
    )

    return X_train, X_validate, X_holdout, y_train, y_validate, y_holdout


def train_for_rows(rows, model_key, random_seed):
    if not rows:
        return None

    feature_order = rows[0].get('featureOrder') or []
    X = np.asarray([row.get('featureValues', []) for row in rows], dtype=float)
    y = np.asarray([int(row.get('label', 0)) for row in rows], dtype=int)

    if X.shape[0] < 10:
        return None

    if len(np.unique(y)) < 2:
        return None

    try:
        X_train, X_validate, X_holdout, y_train, y_validate, y_holdout = split_dataset(X, y, random_seed)
    except ValueError:
        return None

    model = LogisticRegression(
        max_iter=1000,
        class_weight='balanced',
        random_state=random_seed,
        penalty='l2',
        solver='lbfgs',
    )
    model.fit(X_train, y_train)

    holdout_scores = model.predict_proba(X_holdout)[:, 1]
    validate_scores = model.predict_proba(X_validate)[:, 1]

    holdout_auc = safe_auc(y_holdout, holdout_scores)
    validate_auc = safe_auc(y_validate, validate_scores)

    precision20, recall20 = precision_recall_at_k(y_holdout, holdout_scores, k=20)

    binary_preds = (holdout_scores >= 0.5).astype(int)
    cm = confusion_matrix(y_holdout, binary_preds, labels=[0, 1]).tolist()

    calibration_curve_rows, calibration_error = calibration_bins(y_holdout, holdout_scores)

    return {
        'modelKey': model_key,
        'featureOrder': feature_order,
        'weights': [float(weight) for weight in model.coef_[0]],
        'intercept': float(model.intercept_[0]),
        'sampleCount': int(len(rows)),
        'positiveCount': int(np.sum(y == 1)),
        'metrics': {
            'validateAuc': round(validate_auc, 6),
            'holdoutAuc': round(holdout_auc, 6),
            'precisionAt20': round(float(precision20), 6),
            'recallAt20': round(float(recall20), 6),
            'calibrationCurve': calibration_curve_rows,
            'calibrationError': calibration_error,
            'confusionMatrix': {
                'labels': [0, 1],
                'values': cm,
            },
            'splits': {
                'train': int(len(y_train)),
                'validate': int(len(y_validate)),
                'holdout': int(len(y_holdout)),
            },
        },
    }


def group_rows(rows):
    grouped_exact = {}
    grouped_city = {}

    for row in rows:
        city = str(row.get('city', 'unknown')).strip().lower() or 'unknown'
        role_cluster = str(row.get('roleCluster', 'general')).strip().lower() or 'general'

        exact_key = f'{city}::{role_cluster}'
        city_key = f'{city}::*'

        grouped_exact.setdefault(exact_key, []).append(row)
        grouped_city.setdefault(city_key, []).append(row)

    return grouped_exact, grouped_city


def aggregate_metrics(models):
    if not models:
        return {
            'holdoutAuc': 0.0,
            'precisionAt20': 0.0,
            'recallAt20': 0.0,
            'calibrationError': 1.0,
            'trainedModelCount': 0,
        }

    total_samples = max(1, sum(model.get('sampleCount', 0) for model in models))

    def weighted(metric_name):
        weighted_sum = 0.0
        for model in models:
            weight = model.get('sampleCount', 0) / total_samples
            weighted_sum += weight * float(model.get('metrics', {}).get(metric_name, 0.0))
        return round(weighted_sum, 6)

    return {
        'holdoutAuc': weighted('holdoutAuc'),
        'precisionAt20': weighted('precisionAt20'),
        'recallAt20': weighted('recallAt20'),
        'calibrationError': weighted('calibrationError'),
        'trainedModelCount': len(models),
    }


def main():
    parser = argparse.ArgumentParser(description='Train logistic matchmaking models.')
    parser.add_argument('--input', required=True, help='Path to match-training.json')
    parser.add_argument('--output', required=True, help='Path for training artifacts JSON')
    parser.add_argument('--random-seed', type=int, default=42)
    parser.add_argument('--min-cluster-samples', type=int, default=120)
    parser.add_argument('--min-city-samples', type=int, default=240)
    parser.add_argument('--min-positive-samples', type=int, default=20)

    args = parser.parse_args()

    input_path = Path(args.input)
    output_path = Path(args.output)

    rows = load_rows(input_path)
    labeled = [row for row in rows if int(row.get('label', -1)) in (0, 1)]

    grouped_exact, grouped_city = group_rows(labeled)

    trained_models = []
    skipped = []

    for model_key, bucket in sorted(grouped_exact.items()):
        positives = sum(1 for row in bucket if int(row.get('label', 0)) == 1)
        if len(bucket) < args.min_cluster_samples or positives < args.min_positive_samples:
            skipped.append({'modelKey': model_key, 'reason': 'insufficient_cluster_samples'})
            continue

        model = train_for_rows(bucket, model_key, args.random_seed)
        if not model:
            skipped.append({'modelKey': model_key, 'reason': 'training_failed_or_single_class'})
            continue
        trained_models.append(model)

    for model_key, bucket in sorted(grouped_city.items()):
        positives = sum(1 for row in bucket if int(row.get('label', 0)) == 1)
        if len(bucket) < args.min_city_samples or positives < args.min_positive_samples:
            skipped.append({'modelKey': model_key, 'reason': 'insufficient_city_samples'})
            continue

        model = train_for_rows(bucket, model_key, args.random_seed)
        if not model:
            skipped.append({'modelKey': model_key, 'reason': 'training_failed_or_single_class'})
            continue
        trained_models.append(model)

    global_model = train_for_rows(labeled, '*::*', args.random_seed)
    if global_model:
        trained_models.append(global_model)
    else:
        skipped.append({'modelKey': '*::*', 'reason': 'global_training_failed'})

    model_version = datetime.utcnow().strftime('%Y%m%d%H%M%S')

    aggregate = aggregate_metrics(trained_models)

    artifact = {
        'modelVersion': model_version,
        'featureOrder': trained_models[0]['featureOrder'] if trained_models else [],
        'models': trained_models,
        'aggregateMetrics': aggregate,
        'perClusterMetrics': {
            model['modelKey']: model['metrics'] for model in trained_models
        },
        'skipped': skipped,
        'inputRows': len(rows),
        'labeledRows': len(labeled),
        'randomSeed': args.random_seed,
        'thresholds': {
            'minClusterSamples': args.min_cluster_samples,
            'minCitySamples': args.min_city_samples,
            'minPositiveSamples': args.min_positive_samples,
        },
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open('w', encoding='utf-8') as handle:
        json.dump(artifact, handle, indent=2)

    print(json.dumps(artifact))


if __name__ == '__main__':
    main()
