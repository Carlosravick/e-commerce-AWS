import os
import boto3
import logging

from datetime import datetime
from decimal import Decimal

# Configuração do logger para que os logs apareçam no CloudWatch
logger = logging.getLogger()
logger.setLevel(logging.INFO)

# Inicializa o client do DynamoDB usando o Boto3 (SDK da AWS para Python)
dynamodb = boto3.resource('dynamodb')

# Variável de ambiente da tabela do DynamoDB
table = dynamodb.Table(os.environ['DYNAMODB_TABLE'])

# Função de conversão de Decimal para float
def convert_floats(obj):
    """
    Converte todos os floats de um objeto (dict ou list) para Decimal.
    Necessária porque o json.dumps não consegue serializar o tipo Decimal retornado pelo DynamoDB.
    """
    if isinstance(obj, float):
        return Decimal(str(obj))
    elif isinstance(obj, dict):
        return {k: convert_floats(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_floats(i) for i in obj]
    else:
        return obj

# Função principal da Lambda
def lambda_handler(event, context):
    """
    Esta função é acionada pela Step Function após o pagamento do pedido.
    Ela armazena os dados do pedido no DynamoDB.
    """

    # Loga o evento recebido para visualização no CloudWatch
    logger.info(f"Evento Recebido: {event}")

    try:
        # Extrai os dados do evento
        pedido_id = event['pedidoId']
        produtos = convert_floats(event['produtos'])
        total = Decimal(str(event['total']))
        status = event.get('status')
        motivo = event.get('motivo', None)

        # Monta o item a ser salvo no DynamoDB
        item = {
            "pedidoId": pedido_id,
            "produtos": produtos,
            "total": total,
            "status": status,
            "dataPagamento": datetime.utcnow().isoformat()
        }

        # Se o pedido foi cancelado e tem um motivo, adiciona ao item
        if status == "cancelado" and motivo:
            item["motivo"] = motivo

        # Salva o item na tabela
        table.put_item(Item=item)
        logger.info(f"[DynamoDB] Pedido {pedido_id} salvo com sucesso com status '{status}'.")

        # Retorna uma resposta simples
        return { "status": f"Pedido {status}" }

    except Exception as e:
        # Em caso de erro, loga com stack trace
        logger.error(f"[Erro] Falha ao processar pedido {pedido_id if 'pedido_id' in locals() else ''}: {str(e)}", exc_info=True)
        return {
            "status": "Erro ao processar o pedido",
            "erro": str(e)
        }
